import { MedicalSpecialtyModel } from '../model/medicalSpecialty';

export interface MedicalSpecialtyQueryParams {
  name?: string;
  orderDir?: string;
  limit?: string;
}

export interface IMedicalSpecialtyRepository {
  get(id: number): Promise<MedicalSpecialtyModel>;
  getByQuery(
    query: MedicalSpecialtyQueryParams,
  ): Promise<MedicalSpecialtyModel[]>;
  ensureExistOrFail(id: number): Promise<void>;
}
