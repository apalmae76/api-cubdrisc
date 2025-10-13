import { GetGenericAllDto } from 'src/infrastructure/common/dtos/genericRepo-dto.class';
import { PageDto } from 'src/infrastructure/common/dtos/page.dto';
import { EntityManager } from 'typeorm';
import { SurveyModel, SurveyUpdateModel } from '../model/survey';

export interface ISurveyRepository {
  create(patient: SurveyModel, em: EntityManager): Promise<SurveyModel>;
  softDelete(id: number, em?: EntityManager): Promise<boolean>;
  updateIfExistOrFail(
    id: number,
    patient: SurveyUpdateModel,
    em: EntityManager,
  ): Promise<boolean>;
  ensureExistOrFail(id: number): Promise<void>;
  getByQuery(pageOptionsDto: GetGenericAllDto): Promise<PageDto<SurveyModel>>;
  getByIdForPanel(id: number): Promise<SurveyModel>;
  getById(id: number): Promise<SurveyModel>;
  getByIdOrFail(id: number): Promise<SurveyModel>;
}
