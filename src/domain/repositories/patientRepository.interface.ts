import { GetGenericAllDto } from 'src/infrastructure/common/dtos/genericRepo-dto.class';
import { PageDto } from 'src/infrastructure/common/dtos/page.dto';
import { EntityManager } from 'typeorm';
import { PatientCreateModel, PatientModel } from '../model/patient';

export interface IPatientRepository {
  ensureExistOrFail(
    personId: number,
    surveyId: number,
    personSurveyId: number,
  ): Promise<void>;
  create(patient: PatientCreateModel, em: EntityManager): Promise<PatientModel>;
  getByQuery(pageOptionsDto: GetGenericAllDto): Promise<PageDto<PatientModel>>;
  getByIdForPanel(
    personId: number,
    surveyId: number,
    personSurveyId: number,
  ): Promise<PatientModel>;
  getById(
    personId: number,
    surveyId: number,
    personSurveyId: number,
  ): Promise<PatientModel>;
  getByIdOrFail(
    personId: number,
    surveyId: number,
    personSurveyId: number,
  ): Promise<PatientModel>;
}
