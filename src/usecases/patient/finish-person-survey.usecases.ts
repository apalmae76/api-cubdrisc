import { BadRequestException } from '@nestjs/common';
import { JobOptions, Queue } from 'bull';
import { addYears } from 'date-fns';
import { EmailJobData } from 'src/domain/adapters/email-job-data';
import {
  PersonSurveyFullModel,
  PersonSurveyUpdateModel,
} from 'src/domain/model/personSurvey';
import { AnswerModel } from 'src/domain/model/personSurveyAnswers';
import { UseCaseLogger } from 'src/infrastructure/common/decorators/logger.decorator';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { extractErrorDetails } from 'src/infrastructure/common/utils/extract-error-details';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import {
  GetPersonSurveyPresenter,
  PersonSurveyPresenter,
} from 'src/infrastructure/controllers/patient/person-survey.presenter';
import { DatabasePersonSurveyAnswersRepository } from 'src/infrastructure/repositories/person-survey-answers.repository';
import { DatabasePersonSurveyRepository } from 'src/infrastructure/repositories/person-survey.repository';
import { DatabasePersonRepository } from 'src/infrastructure/repositories/person.repository';
import { DatabaseSurveyQuestionsRepository } from 'src/infrastructure/repositories/survey-questions.repository';
import { DatabaseSurveyRiskCalculationRulesRepository } from 'src/infrastructure/repositories/survey-risk-calculation-rules.repository';
import { DatabaseSurveyRepository } from 'src/infrastructure/repositories/survey.repository';
import ContextStorageService, {
  ContextStorageServiceKey,
} from 'src/infrastructure/services/context/context.interface';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { PdfGeneratorService } from 'src/infrastructure/services/pdf-generator/pdf-generator.service';
import { ApiRedisService } from 'src/infrastructure/services/redis/redis.service';
import { InjectWithToken } from 'src/infrastructure/usecases-proxy/plugin/decorators/inject-with-token.decorator';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class FinishPersonSurveyUseCases extends UseCaseBase {
  private readonly surveyTtl: number = 4 * 60 * 60; // 4 hours
  constructor(
    private readonly personRepo: DatabasePersonRepository,
    private readonly personSurveyRepo: DatabasePersonSurveyRepository,
    private readonly surveyRepo: DatabaseSurveyRepository,
    private readonly personSurveyAnswerRepo: DatabasePersonSurveyAnswersRepository,
    private readonly surveyRiscCRepo: DatabaseSurveyRiskCalculationRulesRepository,
    private readonly surveyQuestionRepo: DatabaseSurveyQuestionsRepository,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly redisService: ApiRedisService,
    private readonly appConfig: EnvironmentConfigService,
    @InjectWithToken(ContextStorageServiceKey)
    private readonly contextStorageService: ContextStorageService,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.context = `${FinishPersonSurveyUseCases.name}.`;
  }

  @UseCaseLogger()
  async execute(
    referenceId: string,
    emailSyncQueue: Queue<EmailJobData>,
  ): Promise<GetPersonSurveyPresenter> {
    const {
      personSurveyData,
      personSurvey,
      newPersonSurveyData,
      answeredQuestions,
    } = await this.validate(referenceId);

    const updSurvey = await this.persistIMCData(
      personSurveyData,
      newPersonSurveyData,
    );

    await this.sendConfirmationEmail(
      emailSyncQueue,
      personSurvey,
      answeredQuestions,
    );
    return new BaseResponsePresenter(
      `messages.person_survey.CLOSED_SUCESSFULLY|{"identityCardNumber":"${personSurveyData.personCi}"}`,
      updSurvey,
    );
  }

  private async validate(referenceId: string): Promise<{
    personSurveyData: PersonSurveyPresenter;
    personSurvey: PersonSurveyFullModel;
    newPersonSurveyData: PersonSurveyUpdateModel;
    answeredQuestions: AnswerModel[];
  }> {
    const personSurveyData = await this.validateBase(referenceId);

    const { personId, surveyId, personSurveyId } = personSurveyData;
    const [personSurvey, testQIds] = await Promise.all([
      this.personSurveyRepo.getByIdOrFail(surveyId, personId, personSurveyId),
      this.surveyQuestionRepo.getIds(surveyId),
    ]);
    // validate imc calulation
    if (!personSurvey.imcValue) {
      const args = {
        technicalError: `BMI has not been calculated, return the user to step 2 to continue`,
      };
      throw new BadRequestException({
        message: [
          `validation.person_survey.MISSING_IMC|${JSON.stringify(args)}`,
        ],
      });
    }

    const noAnsweredQuestions: number[] = [];
    const answeredQuestions: AnswerModel[] = [];
    let totalScore = personSurvey.imcPoints;
    for (let questionId of testQIds) {
      questionId = Number(questionId);
      const userQAnswer = await this.personSurveyAnswerRepo.getQuestionAnswer(
        personId,
        surveyId,
        personSurveyId,
        questionId,
      );
      if (userQAnswer) {
        answeredQuestions.push(userQAnswer);
        totalScore = totalScore + userQAnswer.value;
      } else {
        noAnsweredQuestions.push(questionId);
      }
    }

    const count = noAnsweredQuestions.length;
    if (count > 0) {
      const args = {
        count,
        technicalError: `There are ${count} questions without answer (${noAnsweredQuestions.join(', ')})`,
      };
      throw new BadRequestException({
        message: [
          `validation.person_survey.MISSING_ANSWERS|${JSON.stringify(args)}`,
        ],
      });
    }

    const newPersonSurveyData: PersonSurveyUpdateModel = {};
    newPersonSurveyData.totalScore = totalScore;

    //Calculate estimatedRisk
    const testRules = await this.surveyRiscCRepo.getSurveyRules(surveyId);
    const estimatedRiskRule = testRules.find(
      (rule) => totalScore >= rule.minRange && totalScore <= rule.maxRange,
    );
    if (estimatedRiskRule) {
      newPersonSurveyData.estimatedRisk = estimatedRiskRule.label;
    } else {
      const args = {
        totalScore,
        technicalError: `It was not possible to determine the estimated risk, please check the process`,
      };
      throw new BadRequestException({
        message: [
          `validation.person_survey.MISSING_ESTIMATED_RISK|${JSON.stringify(args)}`,
        ],
      });
    }
    const [person, survey] = await Promise.all([
      this.personRepo.getByIdOrFail(personId),
      this.surveyRepo.getByIdOrFail(surveyId),
    ]);

    const response = {
      personSurveyData,
      personSurvey: {
        surveyName: survey.name,
        surveyDescription: survey.description,
        ...person,
        ...personSurvey,
        totalScore,
        estimatedRisk: estimatedRiskRule.label,
        estimatedRiskDescription: estimatedRiskRule.description,
        estimatedRiskPercent: estimatedRiskRule.percent,
      },
      newPersonSurveyData,
      answeredQuestions,
    };
    return response;
  }

  async persistIMCData(
    personSurveyData: PersonSurveyPresenter,
    newPersonSurveyData: PersonSurveyUpdateModel,
  ): Promise<PersonSurveyPresenter> {
    const context = `${this.context}persistIMCData`;
    this.logger.debug('Saving data', {
      context,
      personSurveyData,
      newPersonSurveyData,
    });
    const { personId, surveyId, personSurveyId } = personSurveyData;
    await this.personSurveyRepo.update(
      personId,
      surveyId,
      personSurveyId,
      newPersonSurveyData,
      null,
    );
    const cacheKey = this.getCacheKey(personSurveyData.referenceId);
    await this.redisService.set(cacheKey, personSurveyData, this.surveyTtl);
    return personSurveyData;
  }

  async validateBase(referenceId: string): Promise<PersonSurveyPresenter> {
    const cacheKey = this.getCacheKey(referenceId);
    const personSurveyData =
      await this.redisService.get<PersonSurveyPresenter>(cacheKey);

    if (!personSurveyData) {
      const args = {
        technicalError: `Patient survey relation (${referenceId}) does not exist or data expired`,
      };
      throw new BadRequestException({
        message: [
          `validation.person_survey.NOT_EXIST_OR_EXPIRED|${JSON.stringify(args)}`,
        ],
      });
    }
    return personSurveyData;
  }

  private getCacheKey(referenceId: string): string {
    return `PatientSurvey:${referenceId}`;
  }

  private async sendConfirmationEmail(
    emailSyncQueue: Queue<EmailJobData>,
    personSurvey: PersonSurveyFullModel,
    answeredQuestions: AnswerModel[],
  ) {
    const context = `${this.context}sendConfirmationEmail`;
    this.logger.debug(`Starting`, {
      context,
      personSurvey,
      answeredQuestions,
    });
    try {
      const pdfBuffer = await this.generarPdfTestMedico(
        personSurvey,
        answeredQuestions,
      );
      const medics = [
        // TODO see how to make this information dynamic
        {
          name: 'Dr. Eduardo Cabrera Rode - Especialista en Endocrinología',
          contact: 'eduardo.cabrerarode@gmail.com',
        },
        {
          name: 'Dra. Silvia Trurcios Tristá - Especialista de 1er y 2do Grados en Endocrinología',
          contact: 'silviaelena@infomed.sld.cu',
        },
        {
          name: 'Dr. Fernando Félix Matos Valdés - Médico Internista',
          contact: 'ferdifelix98@gmail.com',
        },
      ];
      const emailOptions: EmailJobData = {
        mailOptions: {
          subject: 'Resultados de su evaluación de riesgo',
          to: personSurvey.email,
          template: 'test-confirmation-es',
          context: {
            personFullName: personSurvey.fullName,
            testName: personSurvey.surveyName,
            medics,
            contactPhone: '78327275',
            contactAddress: 'Calle Zapata y D, Vedado, La Habana, 10400, Cuba',
          },
          attachments: [
            {
              filename: `test_medico_${personSurvey.ci}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ],
        },
        mailType: 'Store order payment email',
        correlationId: this.contextStorageService.getContextId() ?? undefined,
      };
      const options: JobOptions = {
        backoff: 120000, // 2 mins in milliseconds,
      };
      emailSyncQueue.add(emailOptions, options);
      this.logger.debug(`Ended successfully`, {
        context,
      });
    } catch (er) {
      this.logger.verbose(`Ends with errors: {message}`, {
        context,
        message: extractErrorDetails(er).message ?? 'None',
      });
    }
  }

  private async generarPdfTestMedico(
    personSurvey: PersonSurveyFullModel,
    answeredQuestions: AnswerModel[],
  ) {
    const pdfData = {
      test: {
        nombre: personSurvey.surveyName,
        description: personSurvey.surveyDescription,
      },
      personSurvey,
      answeredQuestions,
      completionDate: new Date(personSurvey.updatedAt).toLocaleDateString(
        'es-ES',
      ),
      generationDate: new Date().toLocaleDateString('es-ES'),
      canRepeatDate: new Date(
        addYears(personSurvey.updatedAt, 1),
      ).toLocaleDateString('es-ES'),
    };

    // Generar PDF
    const pdfBuffer = await this.pdfGenerator.generatePdf(
      'test-medico',
      pdfData,
      {
        format: 'A4',
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      },
    );

    return pdfBuffer;
  }
}
