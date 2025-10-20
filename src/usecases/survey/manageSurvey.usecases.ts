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
import { SurveyPresenter } from 'src/infrastructure/controllers/admin/manageSurvey.presenter';
import { DatabaseOperatorsActionsRepository } from 'src/infrastructure/repositories/operatorsActions.repository';
import { DatabaseSurveyRepository } from 'src/infrastructure/repositories/survey.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class ManageSurveyUseCases extends UseCaseBase {
  constructor(
    private readonly surveyRepo: DatabaseSurveyRepository,
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
      if (newSurvey) {
        const opPayload: OperatorsActionCreateModel = {
          operatorId,
          toUserId: null,
          actionId: EOperatorsActions.SURVEY_CREATE,
          reason: 'Adiciona nuevo test',
          details: newSurvey,
        };
        await this.operActionRepo.create(opPayload, em);
        return newSurvey;
      }
      return null;
    });
    return new BaseResponsePresenter(
      `messages.survey.CREATED_SUCESSFULLY|{"name":"${dataDto.name}"}`,
      new SurveyPresenter(survey),
    );
  }

  @UseCaseLogger()
  async update(
    userId: number,
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

    const updSurvey = await this.persistData(userId, surveyId, newData);
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
    if (
      dataDto.calcRisks !== undefined &&
      dataDto.calcRisks !== survey.calcRisks
    ) {
      newData.calcRisks = dataDto.calcRisks;
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
    userId: number,
    surveyId: number,
    payload: SurveyUpdateModel,
  ): Promise<SurveyPresenter> {
    const context = `${this.context}persistData`;
    this.logger.debug('Saving data', {
      context,
      userId,
      raffleId: surveyId,
      payload,
    });

    const updSurvey = await this.dataSource.transaction(async (em) => {
      const updSurvey = await this.surveyRepo.update(surveyId, payload, em);
      if (updSurvey) {
        const opPayload: OperatorsActionCreateModel = {
          operatorId: userId,
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
    surveyId: number,
    action: boolean,
    userId: number,
  ): Promise<BaseResponsePresenter<SurveyPresenter>> {
    const survey = await this.surveyRepo.getByIdOrFail(surveyId);
    const actionMsg = action
      ? 'ACTIVATED_SUCCESSFULLY'
      : 'DISABLED_SUCCESSFULLY';
    if (survey.active === action) {
      const addInfo = {
        name: survey.name,
        technicalError: `Survey active atribbute has same value you send: ${action}; please check`,
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
      const updSurvey = await this.surveyRepo.setActive(surveyId, action, em);
      if (updSurvey) {
        survey.active = action;
      }
      const opPayload: OperatorsActionCreateModel = {
        operatorId: userId,
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

  @UseCaseLogger()
  async delete(
    surveyId: number,
    userId: number,
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
        operatorId: userId,
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
