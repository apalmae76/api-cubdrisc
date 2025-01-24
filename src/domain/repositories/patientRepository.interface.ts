import { GetGenericAllDto } from 'src/infrastructure/common/dtos/genericRepo-dto.class';
import { PageDto } from 'src/infrastructure/common/dtos/page.dto';
import { EntityManager } from 'typeorm';
import { PatientModel, PatientUpdateModel } from '../model/patient';

export interface IPatientRepository {
  ensureExistOrFail(id: number): Promise<void>;
  create(patient: PatientModel, em: EntityManager): Promise<PatientModel>;
  softDelete(id: number, em?: EntityManager): Promise<boolean>;
  updateIfExistOrFail(
    id: number,
    patient: PatientUpdateModel,
    em: EntityManager,
  ): Promise<boolean>;
  setEmail(
    id: number,
    email: string | null,
    em: EntityManager,
  ): Promise<boolean>;
  setPhone(
    id: number,
    phone: string | null,
    em: EntityManager,
  ): Promise<boolean>;
  getByQuery(pageOptionsDto: GetGenericAllDto): Promise<PageDto<PatientModel>>;
  getByIdForPanel(id: number): Promise<PatientModel>;
  getById(id: number): Promise<PatientModel>;
  getByIdOrFail(id: number): Promise<PatientModel>;
  patientsAreSame(user1: PatientModel, user2: PatientUpdateModel): boolean;
}
