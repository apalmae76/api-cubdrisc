import { GetGenericAllDto } from 'src/infrastructure/common/dtos/genericRepo-dto.class';
import { PageDto } from 'src/infrastructure/common/dtos/page.dto';
import { EntityManager } from 'typeorm';
import {
  SurveyRiskCalculationRulesCreateModel,
  SurveyRiskCalculationRulesModel,
  SurveyRiskCalculationRulesUpdateModel,
} from '../model/surveyRiskCalculationRules';

export interface ISurveyRiskCalculationRulesRepository {
  create(
    data: SurveyRiskCalculationRulesCreateModel,
    em: EntityManager,
  ): Promise<SurveyRiskCalculationRulesModel>;
  delete(
    surveyId: number,
    id: number,
    em?: EntityManager,
  ): Promise<boolean>;
  update(
    surveyId: number,
    id: number,
    data: SurveyRiskCalculationRulesUpdateModel,
    em: EntityManager,
  ): Promise<boolean>;
  ensureExistOrFail(surveyId: number, id: number): Promise<void>;
  getByQuery(
    pageOptionsDto: GetGenericAllDto,
  ): Promise<PageDto<SurveyRiskCalculationRulesModel>>;
  getByIdForPanel(
    surveyId: number,
    id: number,
  ): Promise<SurveyRiskCalculationRulesModel>;
  getById(
    surveyId: number,
    id: number,
  ): Promise<SurveyRiskCalculationRulesModel>;
  getByIdOrFail(
    surveyId: number,
    id: number,
  ): Promise<SurveyRiskCalculationRulesModel>;
}
