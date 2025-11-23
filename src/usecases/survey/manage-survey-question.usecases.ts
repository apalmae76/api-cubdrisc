import { BadRequestException } from '@nestjs/common';
import { OperatorsActionCreateModel } from 'src/domain/model/operatorsActions';
import {
  SurveyQuestionCreateModel,
  SurveyQuestionModel,
  SurveyQuestionUpdateModel,
} from 'src/domain/model/surveyQuestion';
import { UseCaseLogger } from 'src/infrastructure/common/decorators/logger.decorator';
import {
  BaseResponsePresenter,
  BooleanDataResponsePresenter,
} from 'src/infrastructure/common/dtos/baseResponse.dto';
import { EOperatorsActions } from 'src/infrastructure/common/utils/constants';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import {
  CreateSurveyQuestionDto,
  UpdateSurveyQuestionDto,
} from 'src/infrastructure/controllers/admin/manage-survey-question-dto.class';
import { SurveyQuestionPresenter } from 'src/infrastructure/controllers/admin/manage-survey-question.presenter';
import { DatabaseOperatorsActionsRepository } from 'src/infrastructure/repositories/operators-actions.repository';
import { DatabaseSurveyQuestionsRepository } from 'src/infrastructure/repositories/survey-questions.repository';
import { DatabaseSurveyRepository } from 'src/infrastructure/repositories/survey.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class ManageSurveyQuestionUseCases extends UseCaseBase {
  constructor(
    private readonly surveyRepo: DatabaseSurveyRepository,
    private readonly surveyQuestionRepo: DatabaseSurveyQuestionsRepository,
    private readonly operActionRepo: DatabaseOperatorsActionsRepository,
    private readonly appConfig: EnvironmentConfigService,
    protected readonly dataSource: DataSource,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.context = `${ManageSurveyQuestionUseCases.name}.`;
  }

  @UseCaseLogger()
  async create(
    operatorId: number,
    surveyId: number,
    dataDto: CreateSurveyQuestionDto,
  ): Promise<BaseResponsePresenter<SurveyQuestionPresenter>> {
    // validate if survey exist
    await this.surveyRepo.getByIdOrFail(surveyId);
    const newData: SurveyQuestionCreateModel = {
      ...dataDto,
      surveyId,
    };
    const question = await this.dataSource.transaction(async (em) => {
      const newQuestion = await this.surveyQuestionRepo.create(newData, em);
      if (newQuestion) {
        const opPayload: OperatorsActionCreateModel = {
          operatorId,
          toUserId: null,
          actionId: EOperatorsActions.SURVEY_QUESTION_CREATE,
          reason: 'Adiciona nueva pregunta a un test',
          details: newQuestion,
        };
        await this.operActionRepo.create(opPayload, em);
        return newQuestion;
      }
      return null;
    });
    return new BaseResponsePresenter(
      `messages.survey_question.CREATED_SUCESSFULLY|{"question":"${dataDto.question}"}`,
      new SurveyQuestionPresenter(question),
    );
  }

  @UseCaseLogger()
  async update(
    operatorId: number,
    surveyId: number,
    questionId: number,
    dataDto: UpdateSurveyQuestionDto,
  ): Promise<BaseResponsePresenter<SurveyQuestionPresenter>> {
    const context = `${this.context}update`;
    const { newData, question } = await this.validateUpdate(
      surveyId,
      questionId,
      dataDto,
    );

    if (newData === null) {
      const response = new BaseResponsePresenter(
        `messages.survey_question.CREATED_SUCESSFULLY|{"surveyId":"${surveyId}","questionId":"${questionId}"}`,
        new SurveyQuestionPresenter(question),
      );
      return this.handleNoChangedValuesOnUpdate(
        context,
        response,
        this.appConfig.isProductionEnv(),
      );
    }
    const updSurvey = await this.persistData(
      operatorId,
      surveyId,
      questionId,
      newData,
    );
    return new BaseResponsePresenter(
      `messages.survey_question.UPDATED_SUCESSFULLY|{"surveyId":"${surveyId}","questionId":"${questionId}"}`,
      updSurvey,
    );
  }

  private async validateUpdate(
    surveyId: number,
    questionId: number,
    dataDto: UpdateSurveyQuestionDto,
  ): Promise<{
    newData: SurveyQuestionUpdateModel | null;
    question: SurveyQuestionModel;
  }> {
    await this.surveyRepo.getByIdOrFail(surveyId);
    const question = await this.surveyQuestionRepo.canUpdate(
      surveyId,
      questionId,
    );

    const newData: SurveyQuestionUpdateModel = {};
    if (
      dataDto.question !== undefined &&
      dataDto.question !== question.question
    ) {
      newData.question = dataDto.question;
    }
    if (
      dataDto.required !== undefined &&
      dataDto.required !== question.required
    ) {
      newData.required = dataDto.required;
    }

    if (Object.keys(newData).length === 0) {
      return { newData: null, question: question };
    }
    return { newData, question };
  }

  async persistData(
    operatorId: number,
    surveyId: number,
    questionId: number,
    payload: SurveyQuestionUpdateModel,
  ): Promise<SurveyQuestionPresenter> {
    const context = `${this.context}persistData`;
    this.logger.debug('Saving data', {
      context,
      operatorId,
      surveyId,
      questionId,
      payload,
    });

    await this.dataSource.transaction(async (em) => {
      const updQuestion = await this.surveyQuestionRepo.update(
        surveyId,
        questionId,
        payload,
        em,
      );
      if (updQuestion) {
        const opPayload: OperatorsActionCreateModel = {
          operatorId: operatorId,
          toUserId: null,
          actionId: EOperatorsActions.SURVEY_QUESTION_UPDATE,
          reason: 'Modifica un test',
          details: payload,
        };
        await this.operActionRepo.create(opPayload, em);
      }
      return updQuestion;
    });
    const question = await this.surveyQuestionRepo.getById(
      surveyId,
      questionId,
    );
    return new SurveyQuestionPresenter(question);
  }

  @UseCaseLogger()
  async delete(
    operatorId: number,
    surveyId: number,
    questionId: number,
  ): Promise<BooleanDataResponsePresenter> {
    const question = await this.surveyQuestionRepo.canUpdate(
      surveyId,
      questionId,
    );
    const jsonIds = `{"surveyId":"${surveyId}","questionId":"${questionId}"}`;
    if (question.deletedAt) {
      const response = new BooleanDataResponsePresenter(
        `messages.survey_question.DELETED|${jsonIds}`,
        true,
      );
      const error = new BadRequestException({
        message: [`validation.survey_question.ALREADY_DELETED|${jsonIds}`],
      });
      return this.handleNoChangedValuesOnUpdate(
        `${this.context}delete`,
        response,
        this.appConfig.isProductionEnv(),
        error,
      );
    }

    const result = await this.dataSource.transaction(async (em) => {
      const result = await this.surveyQuestionRepo.softDelete(
        surveyId,
        questionId,
        em,
      );
      const opPayload: OperatorsActionCreateModel = {
        operatorId,
        toUserId: null,
        actionId: EOperatorsActions.SURVEY_QUESTION_DELETE,
        reason: `Deshabilitar pregunta de forma permanente: ${result}`,
        details: question,
      };
      await this.operActionRepo.create(opPayload, em);
      return result;
    });

    const actionMsg = result ? 'DELETED' : 'NOT_DELETED';
    return new BooleanDataResponsePresenter(
      `messages.survey_question.${actionMsg}|${jsonIds}`,
      result,
    );
  }
}
