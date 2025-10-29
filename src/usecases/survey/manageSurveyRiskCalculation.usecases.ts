import { BadRequestException } from '@nestjs/common';
import { OperatorsActionCreateModel } from 'src/domain/model/operatorsActions';
import {
  SurveyRiskCalculationRangesCreateModel,
  SurveyRiskCalculationRangesModel,
  SurveyRiskCalculationRangesUpdateModel,
} from 'src/domain/model/surveyRiskCalculationRanges';
import { UseCaseLogger } from 'src/infrastructure/common/decorators/logger.decorator';
import {
  BaseResponsePresenter,
  BooleanDataResponsePresenter,
} from 'src/infrastructure/common/dtos/baseResponse.dto';
import { EOperatorsActions } from 'src/infrastructure/common/utils/constants';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import {
  CreateSurveyRiskCalculationDto,
  UpdateSurveyRiskCalculationDto,
} from 'src/infrastructure/controllers/admin/manage-survey-risk-calculation-dto.class';
import { SurveyRiskCalculationPresenter } from 'src/infrastructure/controllers/admin/manageSurveyRiskCalculation.presenter';
import { DatabaseOperatorsActionsRepository } from 'src/infrastructure/repositories/operatorsActions.repository';
import { DatabaseSurveyRepository } from 'src/infrastructure/repositories/survey.repository';
import { DatabaseSurveyRiskCalculationRangesRepository } from 'src/infrastructure/repositories/surveyRiskCalculationRanges.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class ManageSurveyRiskCalculationUseCases extends UseCaseBase {
  constructor(
    private readonly surveyRepo: DatabaseSurveyRepository,
    private readonly surveyRiscCRepo: DatabaseSurveyRiskCalculationRangesRepository,
    private readonly operActionRepo: DatabaseOperatorsActionsRepository,
    private readonly appConfig: EnvironmentConfigService,
    protected readonly dataSource: DataSource,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.context = `${ManageSurveyRiskCalculationUseCases.name}.`;
  }

  @UseCaseLogger()
  async create({
    operatorId,
    surveyId,
    dataDto,
  }: {
    operatorId: number;
    surveyId: number;
    dataDto: CreateSurveyRiskCalculationDto;
  }): Promise<BaseResponsePresenter<SurveyRiskCalculationPresenter>> {
    // validate if survey exist
    await this.surveyRepo.getByIdOrFail(surveyId);
    const newData: SurveyRiskCalculationRangesCreateModel = {
      ...dataDto,
      surveyId,
    };
    const rule = await this.dataSource.transaction(async (em) => {
      const newRule = await this.surveyRiscCRepo.create(newData, em);
      if (newRule) {
        const opPayload: OperatorsActionCreateModel = {
          operatorId,
          toUserId: null,
          actionId: EOperatorsActions.SURVEY_RISK_CALCULATION_CREATE,
          reason: 'Adiciona nueva pregunta a un test',
          details: newRule,
        };
        await this.operActionRepo.create(opPayload, em);
        return newRule;
      }
      return null;
    });
    return new BaseResponsePresenter(
      `messages.survey_risk_calculation.CREATED_SUCESSFULLY|{"description":"${dataDto.description}"}`,
      new SurveyRiskCalculationPresenter(rule),
    );
  }

  @UseCaseLogger()
  async update(
    operatorId: number,
    surveyId: number,
    ruleId: number,
    dataDto: UpdateSurveyRiskCalculationDto,
  ): Promise<BaseResponsePresenter<SurveyRiskCalculationPresenter>> {
    const context = `${this.context}update`;
    const { newData, rule } = await this.validateUpdate(
      surveyId,
      ruleId,
      dataDto,
    );

    const jsonIds = `{"surveyId":"${surveyId}","ruleId":"${ruleId}"}`;
    if (newData === null) {
      const response = new BaseResponsePresenter(
        `messages.survey_risk_calculation.CREATED_SUCESSFULLY|${jsonIds}`,
        new SurveyRiskCalculationPresenter(rule),
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
      ruleId,
      newData,
    );
    return new BaseResponsePresenter(
      `messages.survey_risk_calculation.UPDATED_SUCESSFULLY|${jsonIds}`,
      updSurvey,
    );
  }

  private async validateUpdate(
    surveyId: number,
    ruleId: number,
    dataDto: UpdateSurveyRiskCalculationDto,
  ): Promise<{
    newData: SurveyRiskCalculationRangesUpdateModel | null;
    rule: SurveyRiskCalculationRangesModel;
  }> {
    await this.surveyRepo.getByIdOrFail(surveyId);
    const rule = await this.surveyRiscCRepo.canUpdate(surveyId, ruleId);

    const newData: SurveyRiskCalculationRangesUpdateModel = {};
    if (
      dataDto.description !== undefined &&
      dataDto.description !== rule.description
    ) {
      newData.description = dataDto.description;
    }
    if (dataDto.maxRange !== undefined && dataDto.maxRange !== rule.maxRange) {
      newData.maxRange = dataDto.maxRange;
    }
    if (dataDto.minRange !== undefined && dataDto.minRange !== rule.minRange) {
      newData.minRange = dataDto.minRange;
    }

    if (Object.keys(newData).length === 0) {
      return { newData: null, rule };
    }
    return { newData, rule };
  }

  async persistData(
    operatorId: number,
    surveyId: number,
    ruleId: number,
    payload: SurveyRiskCalculationRangesUpdateModel,
  ): Promise<SurveyRiskCalculationPresenter> {
    const context = `${this.context}persistData`;
    this.logger.debug('Saving data', {
      context,
      operatorId,
      surveyId,
      questionId: ruleId,
      payload,
    });

    await this.dataSource.transaction(async (em) => {
      const updQuestion = await this.surveyRiscCRepo.update(
        surveyId,
        ruleId,
        payload,
        em,
      );
      if (updQuestion) {
        const opPayload: OperatorsActionCreateModel = {
          operatorId: operatorId,
          toUserId: null,
          actionId: EOperatorsActions.SURVEY_RISK_CALCULATION_UPDATE,
          reason: 'Modifica una regla',
          details: payload,
        };
        await this.operActionRepo.create(opPayload, em);
      }
      return updQuestion;
    });
    const rule = await this.surveyRiscCRepo.getById(surveyId, ruleId, false);
    return new SurveyRiskCalculationPresenter(rule);
  }

  @UseCaseLogger()
  async delete(
    operatorId: number,
    surveyId: number,
    ruleId: number,
  ): Promise<BooleanDataResponsePresenter> {
    const question = await this.surveyRiscCRepo.canUpdate(surveyId, ruleId);
    const jsonIds = `{"surveyId":"${surveyId}","ruleId":"${ruleId}"}`;
    if (question.deletedAt) {
      const response = new BooleanDataResponsePresenter(
        `messages.survey_risk_calculation.DELETED|${jsonIds}`,
        true,
      );
      const error = new BadRequestException({
        message: [
          `validation.survey_risk_calculation.ALREADY_DELETED|${jsonIds}`,
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
      const result = await this.surveyRiscCRepo.softDelete(
        surveyId,
        ruleId,
        em,
      );
      const opPayload: OperatorsActionCreateModel = {
        operatorId,
        toUserId: null,
        actionId: EOperatorsActions.SURVEY_RISK_CALCULATION_DELETE,
        reason: `Deshabilitar regla de forma permanente: ${result}`,
        details: question,
      };
      await this.operActionRepo.create(opPayload, em);
      return result;
    });

    const actionMsg = result ? 'DELETED' : 'NOT_DELETED';
    return new BooleanDataResponsePresenter(
      `messages.survey_risk_calculation.${actionMsg}|${jsonIds}`,
      result,
    );
  }
}
