import { GetGenericAllDto } from 'src/infrastructure/common/dtos/genericRepo-dto.class';
import { PageDto } from 'src/infrastructure/common/dtos/page.dto';
import { EntityManager } from 'typeorm';
import {
  SurveyQuestionModel,
  SurveyQuestionUpdateModel,
} from '../model/surveyQuestion';

export interface ISurveyQuestionsRepository {
  create(
    surveyQuestion: SurveyQuestionModel,
    em: EntityManager,
  ): Promise<SurveyQuestionModel>;
  update(
    surveyId: number,
    id: number,
    patient: SurveyQuestionUpdateModel,
    em: EntityManager,
  ): Promise<boolean>;
  softDelete(
    surveyId: number,
    id: number,
    em?: EntityManager,
  ): Promise<boolean>;
  ensureExistOrFail(surveyId: number, id: number): Promise<void>;
  getByQuery(
    pageOptionsDto: GetGenericAllDto,
  ): Promise<PageDto<SurveyQuestionModel>>;
  getByIdForPanel(surveyId: number, id: number): Promise<SurveyQuestionModel>;
  getById(surveyId: number, id: number): Promise<SurveyQuestionModel>;
  getByIdOrFail(surveyId: number, id: number): Promise<SurveyQuestionModel>;
}
