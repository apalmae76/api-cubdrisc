import { EAppRoles } from 'src/infrastructure/controllers/auth/role.enum';
import { PersonCreateModel } from './person';

export class UserUpdateModel extends PersonCreateModel {
  phone: string;
  email: string;
  medicalSpecialtyId?: number;
}

export class UserCreateModel extends PersonCreateModel {
  phone: string;
  email: string;
  fullName?: string;
  roles: EAppRoles[];
  medicalSpecialtyId: number;
}

export enum EAppLan {
  es = 'es',
  en = 'en',
}

export class MetaData {
  defaultLan?: EAppLan | null;
}

export class UserModel extends UserCreateModel {
  id: number;
  lastLogin?: Date;
  hashRefreshToken?: string;
  medicalSpecialty?: string;
  meta?: MetaData;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export class EntityIdName {
  id: number;
  name: string;
}

export class EntityIdStrName {
  id: string;
  name: string;
}
