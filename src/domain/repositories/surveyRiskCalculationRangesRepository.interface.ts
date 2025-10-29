import { GetGenericAllDto } from 'src/infrastructure/common/dtos/genericRepo-dto.class';
import { PageDto } from 'src/infrastructure/common/dtos/page.dto';
import { EntityManager } from 'typeorm';
import {
  SurveyRiskCalculationRangesCreateModel,
  SurveyRiskCalculationRangesModel,
  SurveyRiskCalculationRangesUpdateModel,
} from '../model/surveyRiskCalculationRanges';

export interface ISurveyRiskCalculationRangesRepository {
  create(
    data: SurveyRiskCalculationRangesCreateModel,
    em: EntityManager,
  ): Promise<SurveyRiskCalculationRangesModel>;
  softDelete(
    surveyId: number,
    id: number,
    em?: EntityManager,
  ): Promise<boolean>;
  update(
    surveyId: number,
    id: number,
    data: SurveyRiskCalculationRangesUpdateModel,
    em: EntityManager,
  ): Promise<boolean>;
  ensureExistOrFail(surveyId: number, id: number): Promise<void>;
  getByQuery(
    pageOptionsDto: GetGenericAllDto,
  ): Promise<PageDto<SurveyRiskCalculationRangesModel>>;
  getByIdForPanel(
    surveyId: number,
    id: number,
  ): Promise<SurveyRiskCalculationRangesModel>;
  getById(
    surveyId: number,
    id: number,
  ): Promise<SurveyRiskCalculationRangesModel>;
  getByIdOrFail(
    surveyId: number,
    id: number,
  ): Promise<SurveyRiskCalculationRangesModel>;
}
