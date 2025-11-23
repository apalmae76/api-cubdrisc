import { BadRequestException } from '@nestjs/common';
import { OperatorsActionCreateModel } from 'src/domain/model/operatorsActions';
import {
  SurveyRiskCalculationRulesCreateModel,
  SurveyRiskCalculationRulesModel,
  SurveyRiskCalculationRulesUpdateModel,
} from 'src/domain/model/surveyRiskCalculationRules';
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
import { SurveyRiskCalculationPresenter } from 'src/infrastructure/controllers/admin/manage-survey-risk-calculation.presenter';
import { DatabaseOperatorsActionsRepository } from 'src/infrastructure/repositories/operators-actions.repository';
import { DatabaseSurveyRiskCalculationRulesRepository } from 'src/infrastructure/repositories/survey-risk-calculation-rules.repository';
import { DatabaseSurveyRepository } from 'src/infrastructure/repositories/survey.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class ManageSurveyRiskCalculationUseCases extends UseCaseBase {
  constructor(
    private readonly surveyRepo: DatabaseSurveyRepository,
    private readonly surveyRiscCRepo: DatabaseSurveyRiskCalculationRulesRepository,
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
    await this.validate(surveyId, dataDto);
    const newData: SurveyRiskCalculationRulesCreateModel = {
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

  private async validate(
    surveyId: number,
    dataDto: CreateSurveyRiskCalculationDto,
  ) {
    await Promise.all([
      this.surveyRepo.ensureExistOrFail(surveyId),
      this.surveyRiscCRepo.ensureMinMaxDoNotOverlap(
        surveyId,
        dataDto.minRange,
        dataDto.maxRange,
      ),
    ]);
    if (dataDto.minRange >= dataDto.maxRange) {
      throw new BadRequestException({
        message: [
          `validation.survey_risk_calculation.MIN_MOST_BE_LESS_THAN_MAX`,
        ],
      });
    }
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
    newData: SurveyRiskCalculationRulesUpdateModel | null;
    rule: SurveyRiskCalculationRulesModel;
  }> {
    await this.surveyRepo.ensureExistOrFail(surveyId);
    const rule = await this.surveyRiscCRepo.canUpdate(surveyId, ruleId);

    const newData: SurveyRiskCalculationRulesUpdateModel = {};
    if (dataDto.label !== undefined && dataDto.label !== rule.label) {
      newData.label = dataDto.label;
    }
    if (
      dataDto.description !== undefined &&
      dataDto.description !== rule.description
    ) {
      newData.description = dataDto.description;
    }
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
    if (dataDto.percent !== undefined && dataDto.percent !== rule.percent) {
      newData.percent = dataDto.percent;
    }

    if (Object.keys(newData).length === 0) {
      return { newData: null, rule };
    }
    // ensure both where sended if once exist
    if (
      (dataDto.minRange >= 0 && dataDto.maxRange === undefined) ||
      (dataDto.minRange === undefined && dataDto.maxRange >= 0)
    ) {
      throw new BadRequestException({
        message: [
          `validation.survey_risk_calculation.UPDATE_MIN_MAX_REQUIRED_TOGETHER`,
        ],
      });
    }
    if (dataDto.minRange >= 0 && dataDto.maxRange >= 0) {
      if (dataDto.minRange >= dataDto.maxRange) {
        throw new BadRequestException({
          message: [
            `validation.survey_risk_calculation.MIN_MOST_BE_LESS_THAN_MAX`,
          ],
        });
      }
      await this.surveyRiscCRepo.ensureMinMaxDoNotOverlap(
        surveyId,
        newData.minRange,
        newData.maxRange,
        ruleId,
      );
    }
    return { newData, rule };
  }

  async persistData(
    operatorId: number,
    surveyId: number,
    ruleId: number,
    payload: SurveyRiskCalculationRulesUpdateModel,
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
