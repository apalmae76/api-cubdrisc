import { GetGenericAllDto } from 'src/infrastructure/common/dtos/genericRepo-dto.class';
import { PageDto } from 'src/infrastructure/common/dtos/page.dto';
import { EntityManager } from 'typeorm';
import {
  PatientSurveyAnswersCreateModel,
  PatientSurveyAnswersModel,
} from '../model/patientSurveyAnswers';

export interface IPatientSurveyAnswersRepository {
  create(
    surveyQuestion: PatientSurveyAnswersCreateModel,
    em: EntityManager,
  ): Promise<PatientSurveyAnswersModel>;
  ensureExistOrFail(
    patientId: number,
    surveyId: number,
    surveyQuestionId: number,
    surveyQuestionAnswerId: number,
  ): Promise<void>;
  getByQuery(
    pageOptionsDto: GetGenericAllDto,
  ): Promise<PageDto<PatientSurveyAnswersModel>>;
  getByIdForPanel(
    patientId: number,
    surveyId: number,
    surveyQuestionId: number,
    surveyQuestionAnswerId: number,
  ): Promise<PatientSurveyAnswersModel>;
  getById(
    patientId: number,
    surveyId: number,
    surveyQuestionId: number,
    surveyQuestionAnswerId: number,
  ): Promise<PatientSurveyAnswersModel>;
  getByIdOrFail(
    patientId: number,
    surveyId: number,
    surveyQuestionId: number,
    surveyQuestionAnswerId: number,
  ): Promise<PatientSurveyAnswersModel>;
}
