import { NotFoundException } from '@nestjs/common';
import { OperatorsActionCreateModel } from 'src/domain/model/operatorsActions';
import { UseCaseLogger } from 'src/infrastructure/common/decorators/logger.decorator';
import { BooleanDataResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { EOperatorsActions } from 'src/infrastructure/common/utils/constants';
import { MoveRowDto } from 'src/infrastructure/controllers/admin/manage-survey-question-dto.class';
import { DatabaseOperatorsActionsRepository } from 'src/infrastructure/repositories/operators-actions.repository';
import { DatabaseSurveyRiskCalculationRulesRepository } from 'src/infrastructure/repositories/survey-risk-calculation-rules.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class MoveSurveyRiskCalculationUseCases extends UseCaseBase {
  constructor(
    private readonly surveyRulesRepo: DatabaseSurveyRiskCalculationRulesRepository,
    private readonly operActionRepo: DatabaseOperatorsActionsRepository,
    protected readonly dataSource: DataSource,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.context = `${MoveSurveyRiskCalculationUseCases.name}.`;
  }

  @UseCaseLogger()
  async execute(
    operatorId: number,
    surveyId: number,
    ruleId: number,
    data: MoveRowDto,
  ): Promise<BooleanDataResponsePresenter> {
    const refOrder = await this.validate(surveyId, ruleId, data);
    const rule = await this.persistData(
      operatorId,
      surveyId,
      ruleId,
      data,
      refOrder,
    );
    this.logger.debug(`Ends after save `, {
      operatorId,
      rule,
    });
    return new BooleanDataResponsePresenter(
      `messages.survey_risk_calculation.UPDATED_SUCESSFULLY|{"surveyId":"${surveyId}","ruleId":"${ruleId}"}`,
      rule,
    );
  }

  private async validate(
    surveyId: number,
    ruleId: number,
    data: MoveRowDto,
  ): Promise<number> {
    const [refRule] = await Promise.all([
      this.surveyRulesRepo.getById(surveyId, data.referenceId),
      this.surveyRulesRepo.canUpdate(surveyId, ruleId),
    ]);
    if (!refRule) {
      const args = {
        surveyId,
        refQuestionId: data.referenceId,
        technicalError: `Reference question with id = ${data.referenceId} not found; check`,
      };
      throw new NotFoundException({
        message: [
          `validation.survey_risk_calculation.REF_NOT_FOUND|${JSON.stringify(args)}`,
        ],
      });
    }
    return refRule.order;
  }

  async persistData(
    operatorId: number,
    surveyId: number,
    ruleToMoveId: number,
    data: MoveRowDto,
    refOrder: number,
  ): Promise<boolean> {
    const context = `${this.context}persistData`;
    this.logger.debug(`Saving data`, {
      context,
      surveyId,
      ruleToMoveId,
      refOrder: refOrder ?? '?',
      data,
    });

    let refPos = data.belowReference ? refOrder + 1 : refOrder - 1;
    if (refPos < 1) {
      refPos = 1;
    }

    const listToUpd = await this.surveyRulesRepo.getToMove(
      surveyId,
      ruleToMoveId,
      refPos,
    );

    let newPos = refPos;
    const opPayload: OperatorsActionCreateModel = {
      operatorId,
      toUserId: null,
      actionId: EOperatorsActions.SURVEY_RISK_CALCULATION_MOVE,
      details: { officeToMoveId: ruleToMoveId, ...data },
      reason:
        'Modifica una regla de calculo de riesgo (cambia el orden de presentación)',
    };
    const result = await this.dataSource.transaction(async (em) => {
      await this.surveyRulesRepo.setOrder(surveyId, ruleToMoveId, refPos, em);
      await Promise.all([
        this.operActionRepo.create(opPayload, em),
        listToUpd.map((val) => {
          this.surveyRulesRepo.setOrder(surveyId, val.id, ++newPos, em);
        }),
      ]);
      return true;
    });
    if (result) {
      this.logger.debug('Moved successfully', { context });
      this.surveyRulesRepo.cleanCacheData(surveyId);
      return true;
    }
    return false;
  }
}
