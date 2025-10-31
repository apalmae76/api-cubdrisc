import { GetGenericAllDto } from 'src/infrastructure/common/dtos/genericRepo-dto.class';
import { PageDto } from 'src/infrastructure/common/dtos/page.dto';
import { EntityManager } from 'typeorm';
import {
  PersonSurveyAnswersCreateModel,
  PersonSurveyAnswersModel,
} from '../model/personSurveyAnswers';

export interface IPersonSurveyAnswersRepository {
  create(
    surveyQuestion: PersonSurveyAnswersCreateModel,
    em: EntityManager,
  ): Promise<PersonSurveyAnswersModel>;
  ensureExistOrFail(
    personId: number,
    surveyId: number,
    personSurveyId: number,
    surveyQuestionId: number,
    surveyQuestionAnswerId: number,
  ): Promise<void>;
  getByQuery(
    pageOptionsDto: GetGenericAllDto,
  ): Promise<PageDto<PersonSurveyAnswersModel>>;
  getByIdForPanel(
    personId: number,
    surveyId: number,
    personSurveyId: number,
    surveyQuestionId: number,
    surveyQuestionAnswerId: number,
  ): Promise<PersonSurveyAnswersModel>;
  getById(
    personId: number,
    surveyId: number,
    personSurveyId: number,
    surveyQuestionId: number,
    surveyQuestionAnswerId: number,
  ): Promise<PersonSurveyAnswersModel>;
  getByIdOrFail(
    personId: number,
    surveyId: number,
    personSurveyId: number,
    surveyQuestionId: number,
    surveyQuestionAnswerId: number,
  ): Promise<PersonSurveyAnswersModel>;
}
