import { BadRequestException } from '@nestjs/common';
import { OperatorsActionCreateModel } from 'src/domain/model/operatorsActions';
import { SurveyModel, SurveyUpdateModel } from 'src/domain/model/survey';
import { UseCaseLogger } from 'src/infrastructure/common/decorators/logger.decorator';
import {
  BaseResponsePresenter,
  BooleanDataResponsePresenter,
} from 'src/infrastructure/common/dtos/baseResponse.dto';
import { EOperatorsActions } from 'src/infrastructure/common/utils/constants';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import {
  CreateSurveyDto,
  UpdateSurveyDto,
} from 'src/infrastructure/controllers/admin/manage-survey-dto.class';
import { SurveyPresenter } from 'src/infrastructure/controllers/admin/manage-survey.presenter';
import { DatabaseOperatorsActionsRepository } from 'src/infrastructure/repositories/operators-actions.repository';
import { DatabaseSurveyQuestionsPossibleAnswersRepository } from 'src/infrastructure/repositories/survey-questions-possible-answers.repository';
import { DatabaseSurveyQuestionsRepository } from 'src/infrastructure/repositories/survey-questions.repository';
import { DatabaseSurveyRiskCalculationRulesRepository } from 'src/infrastructure/repositories/survey-risk-calculation-rules.repository';
import { DatabaseSurveyRepository } from 'src/infrastructure/repositories/survey.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class ManageSurveyUseCases extends UseCaseBase {
  constructor(
    private readonly surveyRepo: DatabaseSurveyRepository,
    private readonly surveyRulesRepo: DatabaseSurveyRiskCalculationRulesRepository,
    private readonly surveyQuestionRepo: DatabaseSurveyQuestionsRepository,
    private readonly surveyQuestionPARepo: DatabaseSurveyQuestionsPossibleAnswersRepository,
    private readonly operActionRepo: DatabaseOperatorsActionsRepository,
    private readonly appConfig: EnvironmentConfigService,
    protected readonly dataSource: DataSource,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.context = `${ManageSurveyUseCases.name}.`;
  }

  @UseCaseLogger()
  async create(
    operatorId: number,
    dataDto: CreateSurveyDto,
  ): Promise<BaseResponsePresenter<SurveyPresenter>> {
    const survey = await this.dataSource.transaction(async (em) => {
      const newSurvey = await this.surveyRepo.create(dataDto, em);
      const opPayload: OperatorsActionCreateModel = {
        operatorId,
        toUserId: null,
        actionId: EOperatorsActions.SURVEY_CREATE,
        reason: 'Adiciona nuevo test',
        details: newSurvey,
      };
      await this.operActionRepo.create(opPayload, em);
      return newSurvey;
    });
    return new BaseResponsePresenter(
      `messages.survey.CREATED_SUCESSFULLY|{"name":"${dataDto.name}"}`,
      new SurveyPresenter(survey),
    );
  }

  @UseCaseLogger()
  async update(
    operatorId: number,
    surveyId: number,
    dataDto: UpdateSurveyDto,
  ): Promise<BaseResponsePresenter<SurveyPresenter>> {
    const context = `${this.context}update`;
    const { newData, survey } = await this.validateUpdate(surveyId, dataDto);

    if (newData === null) {
      const response = new BaseResponsePresenter(
        `messages.survey.CREATED_SUCESSFULLY|{"name":"${dataDto.name}"}`,
        new SurveyPresenter(survey),
      );
      return this.handleNoChangedValuesOnUpdate(
        context,
        response,
        this.appConfig.isProductionEnv(),
      );
    }

    const updSurvey = await this.persistData(operatorId, surveyId, newData);
    return new BaseResponsePresenter(
      `messages.survey.UPDATED_SUCESSFULLY|{"name":"${dataDto.name}"}`,
      updSurvey,
    );
  }

  private async validateUpdate(
    surveyId: number,
    dataDto: UpdateSurveyDto,
  ): Promise<{ newData: SurveyUpdateModel | null; survey: SurveyModel }> {
    const survey = await this.surveyRepo.canUpdate(surveyId);

    const newData: SurveyUpdateModel = {};
    if (dataDto.name !== undefined && dataDto.name !== survey.name) {
      newData.name = dataDto.name;
    }
    if (
      dataDto.description !== undefined &&
      dataDto.description !== survey.description
    ) {
      newData.description = dataDto.description;
    }
    if (dataDto.active !== undefined && dataDto.active !== survey.active) {
      newData.active = dataDto.active;
    }

    if (Object.keys(newData).length === 0) {
      return { newData: null, survey };
    }
    return { newData, survey };
  }

  async persistData(
    operatorId: number,
    surveyId: number,
    payload: SurveyUpdateModel,
  ): Promise<SurveyPresenter> {
    const context = `${this.context}persistData`;
    this.logger.debug('Saving data', {
      context,
      operatorId,
      raffleId: surveyId,
      payload,
    });

    await this.dataSource.transaction(async (em) => {
      const updSurvey = await this.surveyRepo.update(surveyId, payload, em);
      if (updSurvey) {
        const opPayload: OperatorsActionCreateModel = {
          operatorId,
          toUserId: null,
          actionId: EOperatorsActions.SURVEY_UPDATE,
          reason: 'Modifica un test',
          details: payload,
        };
        await this.operActionRepo.create(opPayload, em);
      }
      return updSurvey;
    });
    const survey = await this.surveyRepo.getById(surveyId);
    return new SurveyPresenter(survey);
  }

  @UseCaseLogger()
  async setActive(
    operatorId: number,
    surveyId: number,
    action: boolean,
  ): Promise<BaseResponsePresenter<SurveyPresenter>> {
    const survey = await this.validateToActive(surveyId, action);
    const actionMsg = action
      ? 'ACTIVATED_SUCCESSFULLY'
      : 'DISABLED_SUCCESSFULLY';
    if (survey.active === action) {
      const addInfo = {
        name: survey.name,
        technicalError: `Survey active attribute has same value you send: ${action}; please check`,
      };
      const response = new BaseResponsePresenter(
        `messages.survey.${actionMsg}|${JSON.stringify(addInfo)}`,
        new SurveyPresenter(survey),
      );
      return this.handleNoChangedValuesOnUpdate(
        `${this.context}setActive`,
        response,
        this.appConfig.isProductionEnv(),
      );
    }

    await this.dataSource.transaction(async (em) => {
      const isFirstActivation =
        survey.active === false && survey.draft === true;
      const updSurvey = await this.surveyRepo.setActive(
        surveyId,
        action,
        isFirstActivation,
        em,
      );
      if (updSurvey) {
        survey.active = action;
        survey.draft = false;
      }
      const opPayload: OperatorsActionCreateModel = {
        operatorId,
        toUserId: null,
        actionId: EOperatorsActions.SURVEY_ACTIVE,
        reason: `Poner test como ${action ? 'habilitado' : 'deshabilitado'}`,
        details: survey,
      };
      await this.operActionRepo.create(opPayload, em);
    });

    return new BaseResponsePresenter(
      `messages.survey.${actionMsg}|{"name":"${survey.name}"}`,
      new SurveyPresenter(survey),
    );
  }

  private async validateToActive(
    surveyId: number,
    action: boolean,
  ): Promise<SurveyModel> {
    const survey = await this.surveyRepo.getByIdOrFail(surveyId);
    if (action === false) {
      return survey;
    }
    if (survey.deletedAt) {
      throw new BadRequestException({
        message: `validation.survey.CANT_ACTIVATE_DELETED|{"id":"${surveyId}"}`,
      });
    }
    const errors: string[] = [];
    const rulesCount = await this.surveyRulesRepo.getCount(surveyId);
    if (rulesCount < 2) {
      errors.push(
        `validation.survey.CANT_ACTIVATE_MIN_RULES|{"id":"${surveyId}"}`,
      );
    }

    const questionsCount = await this.surveyQuestionRepo.getCount(surveyId);
    if (questionsCount < 1) {
      errors.push(
        `validation.survey.CANT_ACTIVATE_MIN_QUESTIONS|{"id":"${surveyId}"}`,
      );
    }

    if (questionsCount > 0) {
      const questionsPACount =
        await this.surveyQuestionPARepo.getCount(surveyId);
      const isAnyWithMin =
        questionsPACount.length > 0
          ? questionsPACount.filter((count) => count < 2).length > 0
          : true;
      if (isAnyWithMin) {
        errors.push(
          `validation.survey.CANT_ACTIVATE_MIN_QUESTIONS_ANSWER|{"id":"${surveyId}"}`,
        );
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({ message: errors });
    }

    return survey;
  }

  @UseCaseLogger()
  async delete(
    operatorId: number,
    surveyId: number,
  ): Promise<BooleanDataResponsePresenter> {
    const survey = await this.surveyRepo.getByIdOrFail(surveyId);
    if (survey.deletedAt) {
      const response = new BooleanDataResponsePresenter(
        `messages.survey.DELETED|{"id":"${surveyId}"}`,
        true,
      );
      const error = new BadRequestException({
        message: [`validation.survey.ALREADY_DELETED|{"id":"${surveyId}"}`],
      });
      return this.handleNoChangedValuesOnUpdate(
        `${this.context}delete`,
        response,
        this.appConfig.isProductionEnv(),
        error,
      );
    }

    const result = await this.dataSource.transaction(async (em) => {
      const result = await this.surveyRepo.softDelete(surveyId, em);
      const opPayload: OperatorsActionCreateModel = {
        operatorId,
        toUserId: null,
        actionId: EOperatorsActions.SURVEY_DELETE,
        reason: `Deshabilitar test de forma permanente: ${result}`,
        details: survey,
      };
      await this.operActionRepo.create(opPayload, em);
      return result;
    });

    const actionMsg = result ? 'DELETED' : 'NOT_DELETED';
    return new BooleanDataResponsePresenter(
      `messages.survey.${actionMsg}|{"id":"${surveyId}"}`,
      result,
    );
  }
}
