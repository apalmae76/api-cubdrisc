import { PersonCreateModel } from './person';

export class PatientUpdateModel extends PersonCreateModel {
  phone: string;
  email: string;
  diagnosed?: Date | null;
}

export class PatientModel extends PatientUpdateModel {
  id: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
