import { GetGenericAllDto } from 'src/infrastructure/common/dtos/genericRepo-dto.class';
import { PageDto } from 'src/infrastructure/common/dtos/page.dto';
import { EntityManager } from 'typeorm';
import {
  PatientSurveyCreateModel,
  PatientSurveyModel,
} from '../model/patientSurvey';

export interface IPatientSurveyRepository {
  create(
    surveyQuestion: PatientSurveyCreateModel,
    em: EntityManager,
  ): Promise<PatientSurveyModel>;
  ensureExistOrFail(patientId: number, surveyId: number): Promise<void>;
  getByQuery(
    pageOptionsDto: GetGenericAllDto,
  ): Promise<PageDto<PatientSurveyModel>>;
  getByIdForPanel(
    patientId: number,
    surveyId: number,
  ): Promise<PatientSurveyModel>;
  getById(patientId: number, surveyId: number): Promise<PatientSurveyModel>;
  getByIdOrFail(
    patientId: number,
    surveyId: number,
  ): Promise<PatientSurveyModel>;
}
