import { OperatorsActionCreateModel } from 'src/domain/model/operatorsActions';
import {
  SurveyQuestionPossibleAnswerCreateModel,
  SurveyQuestionPossibleAnswerModel,
  SurveyQuestionPossibleAnswerUpdateModel,
} from 'src/domain/model/surveyQuestionPossibleAnswers';
import { UseCaseLogger } from 'src/infrastructure/common/decorators/logger.decorator';
import {
  BaseResponsePresenter,
  BooleanDataResponsePresenter,
} from 'src/infrastructure/common/dtos/baseResponse.dto';
import { EOperatorsActions } from 'src/infrastructure/common/utils/constants';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import {
  CreateSurveyQuestionAnswerDto,
  UpdateSurveyQuestionAnswerDto,
} from 'src/infrastructure/controllers/admin/manage-survey-question-answer-dto.class';
import { SurveyQuestionAnswerPresenter } from 'src/infrastructure/controllers/admin/manage-survey-question-answer.presenter';
import { DatabaseOperatorsActionsRepository } from 'src/infrastructure/repositories/operators-actions.repository';
import { DatabaseSurveyQuestionsPossibleAnswersRepository } from 'src/infrastructure/repositories/survey-questions-possible-answers.repository';
import { DatabaseSurveyQuestionsRepository } from 'src/infrastructure/repositories/survey-questions.repository';
import { DatabaseSurveyRepository } from 'src/infrastructure/repositories/survey.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class ManageSurveyQuestionAnswerUseCases extends UseCaseBase {
  constructor(
    private readonly surveyRepo: DatabaseSurveyRepository,
    private readonly surveyQuestionRepo: DatabaseSurveyQuestionsRepository,
    private readonly surveyQAnsRepo: DatabaseSurveyQuestionsPossibleAnswersRepository,
    private readonly operActionRepo: DatabaseOperatorsActionsRepository,
    private readonly appConfig: EnvironmentConfigService,
    protected readonly dataSource: DataSource,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.context = `${ManageSurveyQuestionAnswerUseCases.name}.`;
  }

  @UseCaseLogger()
  async create(
    operatorId: number,
    surveyId: number,
    surveyQuestionId: number,
    dataDto: CreateSurveyQuestionAnswerDto,
  ): Promise<BaseResponsePresenter<SurveyQuestionAnswerPresenter>> {
    // validate if survey exist
    await this.surveyRepo.canUpdate(surveyId);
    await this.surveyQuestionRepo.ensureExistOrFail(surveyId, surveyQuestionId);
    const newData: SurveyQuestionPossibleAnswerCreateModel = {
      ...dataDto,
      surveyId,
      surveyQuestionId,
    };
    const answer = await this.dataSource.transaction(async (em) => {
      const newAnswer = await this.surveyQAnsRepo.create(newData, em);
      if (newAnswer) {
        const opPayload: OperatorsActionCreateModel = {
          operatorId,
          actionId: EOperatorsActions.SURVEY_QUESTION_ANSWER_CREATE,
          reason: 'Adiciona nueva posible respuesta, a una pregunta de un test',
          details: newAnswer,
        };
        await this.operActionRepo.create(opPayload, em);
        return newAnswer;
      }
      return null;
    });
    return new BaseResponsePresenter(
      `messages.survey_question_answer.CREATED_SUCESSFULLY|{"answer":"${dataDto.answer}"}`,
      new SurveyQuestionAnswerPresenter(answer),
    );
  }

  @UseCaseLogger()
  async update(
    operatorId: number,
    surveyId: number,
    questionId: number,
    answerId: number,
    dataDto: UpdateSurveyQuestionAnswerDto,
  ): Promise<BaseResponsePresenter<SurveyQuestionAnswerPresenter>> {
    const context = `${this.context}update`;
    const { newData, answer } = await this.validateUpdate(
      surveyId,
      questionId,
      answerId,
      dataDto,
    );

    if (newData === null) {
      const response = new BaseResponsePresenter(
        `messages.survey_question_answer.CREATED_SUCESSFULLY|{"surveyId":"${surveyId}","questionId":"${questionId}","answerId":"${answerId}"}`,
        new SurveyQuestionAnswerPresenter(answer),
      );
      return this.handleNoChangedValuesOnUpdate(
        context,
        response,
        this.appConfig.isProductionEnv(),
      );
    }
    const updAnswer = await this.persistData(
      operatorId,
      surveyId,
      questionId,
      answerId,
      newData,
    );
    return new BaseResponsePresenter(
      `messages.survey_question_answer.UPDATED_SUCESSFULLY|{"surveyId":"${surveyId}","questionId":"${questionId}","answerId":"${answerId}"}`,
      updAnswer,
    );
  }

  private async validateUpdate(
    surveyId: number,
    questionId: number,
    answerId: number,
    dataDto: UpdateSurveyQuestionAnswerDto,
  ): Promise<{
    newData: SurveyQuestionPossibleAnswerUpdateModel | null;
    answer: SurveyQuestionPossibleAnswerModel;
  }> {
    const answer = await this.surveyQAnsRepo.canUpdate(
      surveyId,
      questionId,
      answerId,
    );

    const newData: SurveyQuestionPossibleAnswerUpdateModel = {};
    if (dataDto.answer !== undefined && dataDto.answer !== answer.answer) {
      newData.answer = dataDto.answer;
    }
    if (
      dataDto.educationalTip !== undefined &&
      dataDto.educationalTip !== answer.educationalTip
    ) {
      newData.educationalTip = dataDto.educationalTip?.trim() ?? null;
    }
    if (dataDto.value !== undefined && dataDto.value !== answer.value) {
      newData.value = dataDto.value;
    }
    console.log(newData);
    if (Object.keys(newData).length === 0) {
      return { newData: null, answer };
    }
    return { newData, answer };
  }

  async persistData(
    operatorId: number,
    surveyId: number,
    questionId: number,
    answerId: number,
    payload: SurveyQuestionPossibleAnswerUpdateModel,
  ): Promise<SurveyQuestionAnswerPresenter> {
    const context = `${this.context}persistData`;
    this.logger.debug('Saving data', {
      context,
      operatorId,
      surveyId,
      questionId,
      answerId,
      payload,
    });

    await this.dataSource.transaction(async (em) => {
      const updQuestion = await this.surveyQAnsRepo.update(
        surveyId,
        questionId,
        answerId,
        payload,
        em,
      );
      if (updQuestion) {
        const opPayload: OperatorsActionCreateModel = {
          operatorId: operatorId,
          actionId: EOperatorsActions.SURVEY_QUESTION_ANSWER_UPDATE,
          reason: 'Modifica una posible respuesta',
          details: payload,
        };
        await this.operActionRepo.create(opPayload, em);
      }
      return updQuestion;
    });
    const question = await this.surveyQAnsRepo.getById(
      surveyId,
      questionId,
      answerId,
    );
    return new SurveyQuestionAnswerPresenter(question);
  }

  @UseCaseLogger()
  async delete(
    operatorId: number,
    surveyId: number,
    questionId: number,
    answerId: number,
  ): Promise<BooleanDataResponsePresenter> {
    const question = await this.surveyQAnsRepo.canUpdate(
      surveyId,
      questionId,
      answerId,
    );
    const jsonIds = `{"surveyId":"${surveyId}","questionId":"${questionId}","answerId":"${answerId}"}`;

    const result = await this.dataSource.transaction(async (em) => {
      const result = await this.surveyQAnsRepo.delete(
        surveyId,
        questionId,
        answerId,
        em,
      );
      const opPayload: OperatorsActionCreateModel = {
        operatorId,
        actionId: EOperatorsActions.SURVEY_QUESTION_ANSWER_DELETE,
        reason: `Eliminar respuesta de forma permanente: ${result}`,
        details: question,
      };
      await this.operActionRepo.create(opPayload, em);
      return result;
    });

    const actionMsg = result ? 'DELETED' : 'NOT_DELETED';
    return new BooleanDataResponsePresenter(
      `messages.survey_question_answer.${actionMsg}|${jsonIds}`,
      result,
    );
  }
}
