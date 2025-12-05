import { GetGenericAllDto } from 'src/infrastructure/common/dtos/genericRepo-dto.class';
import { PageDto } from 'src/infrastructure/common/dtos/page.dto';
import { EntityManager } from 'typeorm';
import {
  PersonSurveyCreateModel,
  PersonSurveyModel,
} from '../model/personSurvey';

export interface IPersonSurveyRepository {
  create(
    surveyQuestion: PersonSurveyCreateModel,
    em: EntityManager,
  ): Promise<PersonSurveyModel>;
  ensureExistOrFail(
    personId: number,
    surveyId: number,
    id: number,
  ): Promise<void>;
  getByQuery(
    pageOptionsDto: GetGenericAllDto,
  ): Promise<PageDto<PersonSurveyModel>>;
  getByIdForPanel(
    personId: number,
    surveyId: number,
    id: number,
  ): Promise<PersonSurveyModel>;
  getById(
    personId: number,
    surveyId: number,
    id: number,
  ): Promise<PersonSurveyModel>;
  getByIdOrFail(
    personId: number,
    surveyId: number,
    id: number,
  ): Promise<PersonSurveyModel>;
}
