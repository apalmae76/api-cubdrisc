import { GetGenericAllDto } from 'src/infrastructure/common/dtos/genericRepo-dto.class';
import { PageDto } from 'src/infrastructure/common/dtos/page.dto';
import { EntityManager } from 'typeorm';
import {
  SurveyQuestionPossibleAnswerCreateModel,
  SurveyQuestionPossibleAnswerModel,
  SurveyQuestionPossibleAnswerUpdateModel,
} from '../model/surveyQuestionPossibleAnswers';

export interface ISurveyQuestionsPossibleAnswersRepository {
  create(
    surveyQuestion: SurveyQuestionPossibleAnswerCreateModel,
    em: EntityManager,
  ): Promise<SurveyQuestionPossibleAnswerModel>;
  softDelete(
    surveyId: number,
    surveyQuestionId: number,
    id: number,
    em?: EntityManager,
  ): Promise<boolean>;
  updateIfExistOrFail(
    surveyId: number,
    surveyQuestionId: number,
    id: number,
    patient: SurveyQuestionPossibleAnswerUpdateModel,
    em: EntityManager,
  ): Promise<boolean>;
  ensureExistOrFail(
    surveyId: number,
    surveyQuestionId: number,
    id: number,
  ): Promise<void>;
  getByQuery(
    pageOptionsDto: GetGenericAllDto,
  ): Promise<PageDto<SurveyQuestionPossibleAnswerModel>>;
  getByIdForPanel(
    surveyId: number,
    surveyQuestionId: number,
    id: number,
  ): Promise<SurveyQuestionPossibleAnswerModel>;
  getById(
    surveyId: number,
    surveyQuestionId: number,
    id: number,
  ): Promise<SurveyQuestionPossibleAnswerModel>;
  getByIdOrFail(
    surveyId: number,
    surveyQuestionId: number,
    id: number,
  ): Promise<SurveyQuestionPossibleAnswerModel>;
}
