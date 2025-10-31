import { GetGenericAllDto } from 'src/infrastructure/common/dtos/genericRepo-dto.class';
import { PageDto } from 'src/infrastructure/common/dtos/page.dto';
import { EntityManager } from 'typeorm';
import { PatientModel, PatientUpdateModel } from '../model/patient';

export interface IPatientRepository {
  ensureExistOrFail(personId: number): Promise<void>;
  create(patient: PatientModel, em: EntityManager): Promise<PatientModel>;
  softDelete(personId: number, em?: EntityManager): Promise<boolean>;
  update(
    personId: number,
    patient: PatientUpdateModel,
    em: EntityManager,
  ): Promise<boolean>;
  getByQuery(pageOptionsDto: GetGenericAllDto): Promise<PageDto<PatientModel>>;
  getByIdForPanel(personId: number): Promise<PatientModel>;
  getById(personId: number): Promise<PatientModel>;
  getByIdOrFail(personId: number): Promise<PatientModel>;
}
