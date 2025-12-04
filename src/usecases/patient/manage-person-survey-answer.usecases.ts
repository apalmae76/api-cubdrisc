import { BadRequestException } from '@nestjs/common';
import { PersonSurveyAnswersCreateModel } from 'src/domain/model/personSurveyAnswers';
import { UseCaseLogger } from 'src/infrastructure/common/decorators/logger.decorator';
import {
  BaseResponsePresenter,
  BooleanDataResponsePresenter,
} from 'src/infrastructure/common/dtos/baseResponse.dto';
import { PutAnswerDto } from 'src/infrastructure/controllers/patient/person-answer-dto.class';
import {
  GetPublicSurveyPresenter,
  GetPublicSurveyQuestionPresenter,
  GetPublicSurveyQuestionsPresenter,
  PersonSurveyPresenter,
  PublicAnswerPresenter,
  PublicSurveyPresenter,
  PublicSurveyQuestionPresenter,
  PublicSurveyQuestionsPresenter,
} from 'src/infrastructure/controllers/patient/person-survey.presenter';
import { DatabasePersonSurveyAnswersRepository } from 'src/infrastructure/repositories/person-survey-answers.repository';
import { DatabaseSurveyQuestionsPossibleAnswersRepository } from 'src/infrastructure/repositories/survey-questions-possible-answers.repository';
import { DatabaseSurveyQuestionsRepository } from 'src/infrastructure/repositories/survey-questions.repository';
import { DatabaseSurveyRepository } from 'src/infrastructure/repositories/survey.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { ApiRedisService } from 'src/infrastructure/services/redis/redis.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class ManagePersonSurveyAnswerUseCases extends UseCaseBase {
  constructor(
    private readonly surveyRepo: DatabaseSurveyRepository,
    private readonly surveyQuestionsRepo: DatabaseSurveyQuestionsRepository,
    private readonly surveyQPARepo: DatabaseSurveyQuestionsPossibleAnswersRepository,
    private readonly personSurveyAnswerRepo: DatabasePersonSurveyAnswersRepository,
    private readonly redisService: ApiRedisService,
    private readonly dataSource: DataSource,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.context = `${ManagePersonSurveyAnswerUseCases.name}.`;
  }

  @UseCaseLogger()
  async getSurvey(): Promise<GetPublicSurveyPresenter> {
    const survey = await this.surveyRepo.getActive();
    const response = survey ? new PublicSurveyPresenter(survey) : null;
    return new BaseResponsePresenter('AUTO', response);
  }

  @UseCaseLogger()
  async getSurveyQuestions(
    surveyId: number,
    gender: string,
  ): Promise<GetPublicSurveyQuestionsPresenter> {
    await this.surveyRepo.getByIdOrFail(surveyId);
    const questionsIds = await this.surveyQuestionsRepo.getIds(
      surveyId,
      gender,
    );
    const response =
      (questionsIds?.length ?? 0) > 0
        ? new PublicSurveyQuestionsPresenter(questionsIds)
        : null;
    return new BaseResponsePresenter('AUTO', response);
  }

  @UseCaseLogger()
  async getSurveyQuestion(
    surveyId: number,
    questionId: number,
    referenceId: string,
  ): Promise<GetPublicSurveyQuestionPresenter> {
    const [survey, question] = await Promise.all([
      this.surveyRepo.getByIdOrFail(surveyId),
      this.surveyQuestionsRepo.getByIdOrFail(surveyId, questionId),
    ]);
    const answers: PublicAnswerPresenter[] = [];
    if (survey) {
      const answersModel = await this.surveyQPARepo.getAnswers(
        surveyId,
        questionId,
      );
      if (answersModel.length > 0) {
        const cacheKey = `System:PatientSurvey:${referenceId}`;
        const personSurveyData =
          await this.redisService.get<PersonSurveyPresenter>(cacheKey);

        for (const answer of answersModel) {
          const selectAnswer = personSurveyData
            ? await this.personSurveyAnswerRepo.isAnswer(
              personSurveyData.personId,
              personSurveyData.surveyId,
              personSurveyData.personSurveyId,
              questionId,
              answer.id,
            )
            : false;
          answers.push(new PublicAnswerPresenter(answer, selectAnswer));
        }
      }
    }
    const response = survey
      ? new PublicSurveyQuestionPresenter(question, answers)
      : null;
    return new BaseResponsePresenter('AUTO', response);
  }

  @UseCaseLogger()
  async putAnswer(
    surveyId: number,
    questionId: number,
    dataDto: PutAnswerDto,
  ): Promise<BooleanDataResponsePresenter> {
    const referenceId = dataDto.referenceId;
    const cacheKey = `System:PatientSurvey:${referenceId}`;
    const personSurveyData =
      await this.redisService.get<PersonSurveyPresenter>(cacheKey);
    if (!personSurveyData) {
      const args = {
        technicalError: `Patient survey answer relation (${referenceId}) does not exist or data expired`,
      };
      throw new BadRequestException({
        message: [
          `validation.person_survey.NOT_EXIST_OR_EXPIRED|${JSON.stringify(args)}`,
        ],
      });
    }
    await Promise.all([
      this.surveyRepo.getByIdOrFail(surveyId),
      this.surveyQuestionsRepo.getByIdOrFail(surveyId, questionId),
      this.surveyQPARepo.getByIdOrFail(surveyId, questionId, dataDto.answerId),
    ]);
    const payload: PersonSurveyAnswersCreateModel = {
      personId: personSurveyData.personId,
      surveyId,
      personSurveyId: personSurveyData.personSurveyId,
      surveyQuestionId: questionId,
      surveyQuestionAnswerId: dataDto.answerId,
    };
    const response = await this.dataSource.transaction(async (em) => {
      return this.personSurveyAnswerRepo.setAnswer(payload, em);
    });

    return new BooleanDataResponsePresenter('AUTO', response);
  }
}
