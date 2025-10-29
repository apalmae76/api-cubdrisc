import { BadRequestException } from '@nestjs/common';
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
import { SurveyQuestionAnswerPresenter } from 'src/infrastructure/controllers/admin/manageSurveyQuestionAnswer.presenter';
import { DatabaseOperatorsActionsRepository } from 'src/infrastructure/repositories/operatorsActions.repository';
import { DatabaseSurveyRepository } from 'src/infrastructure/repositories/survey.repository';
import { DatabaseSurveyQuestionsRepository } from 'src/infrastructure/repositories/surveyQuestions.repository';
import { DatabaseSurveyQuestionsPossibleAnswersRepository } from 'src/infrastructure/repositories/surveyQuestionsPossibleAnswers.repository';
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
    await this.surveyRepo.getByIdOrFail(surveyId);
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
          toUserId: null,
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
    await this.surveyRepo.getByIdOrFail(surveyId);
    await this.surveyQuestionRepo.getByIdOrFail(surveyId, questionId);
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
      newData.educationalTip = dataDto.educationalTip;
    }

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
          toUserId: null,
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
  async setActive(
    operatorId: number,
    surveyId: number,
    questionId: number,
    answerId: number,
    action: boolean,
  ): Promise<BaseResponsePresenter<SurveyQuestionAnswerPresenter>> {
    const answer = await this.surveyQAnsRepo.canUpdate(
      surveyId,
      questionId,
      answerId,
      action,
    );
    const actionMsg = action
      ? 'ACTIVATED_SUCCESSFULLY'
      : 'DISABLED_SUCCESSFULLY';
    if (answer.active === action) {
      const addInfo = {
        surveyId,
        questionId,
        answerId,
        answer: answer.answer,
        technicalError: `Survey question answer active attribute has same value you send: ${action}; please check`,
      };
      const response = new BaseResponsePresenter(
        `messages.survey_question_answer.${actionMsg}|${JSON.stringify(addInfo)}`,
        new SurveyQuestionAnswerPresenter(answer),
      );
      return this.handleNoChangedValuesOnUpdate(
        `${this.context}setActive`,
        response,
        this.appConfig.isProductionEnv(),
      );
    }

    await this.dataSource.transaction(async (em) => {
      const updSurvey = await this.surveyQAnsRepo.setActive(
        surveyId,
        questionId,
        answerId,
        action,
        em,
      );
      if (updSurvey) {
        answer.active = action;
      }
      const opPayload: OperatorsActionCreateModel = {
        operatorId: operatorId,
        toUserId: null,
        actionId: EOperatorsActions.SURVEY_QUESTION_ANSWER_ACTIVE,
        reason: `Poner pregunta como ${action ? 'habilitada' : 'deshabilitada'}`,
        details: answer,
      };
      await this.operActionRepo.create(opPayload, em);
    });

    return new BaseResponsePresenter(
      `messages.survey_question.${actionMsg}|{"surveyId":"${surveyId}","questionId":"${questionId}","answerId":"${answerId}"}`,
      new SurveyQuestionAnswerPresenter(answer),
    );
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
    if (question.deletedAt) {
      const response = new BooleanDataResponsePresenter(
        `messages.survey_question_answer.DELETED|${jsonIds}`,
        true,
      );
      const error = new BadRequestException({
        message: [
          `validation.survey_question_answer.ALREADY_DELETED|${jsonIds}`,
        ],
      });
      return this.handleNoChangedValuesOnUpdate(
        `${this.context}delete`,
        response,
        this.appConfig.isProductionEnv(),
        error,
      );
    }

    const result = await this.dataSource.transaction(async (em) => {
      const result = await this.surveyQAnsRepo.softDelete(
        surveyId,
        questionId,
        answerId,
        em,
      );
      const opPayload: OperatorsActionCreateModel = {
        operatorId,
        toUserId: null,
        actionId: EOperatorsActions.SURVEY_QUESTION_ANSWER_DELETE,
        reason: `Deshabilitar respuesta de forma permanente: ${result}`,
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
