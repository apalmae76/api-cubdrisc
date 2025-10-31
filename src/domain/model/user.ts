import { EAppRoles } from 'src/infrastructure/controllers/auth/role.enum';
import { PersonCreateModel } from './person';

export class UserUpdateModel extends PersonCreateModel {
  phone: string;
  email: string;
  medicalSpecialtyId?: number;
}

export enum EAppLan {
  es = 'es',
  en = 'en',
}

export class MetaData {
  defaultLan?: EAppLan | null;
}

export class UserModel extends UserUpdateModel {
  id: number;
  fullName?: string;
  roles: EAppRoles[];
  lastLogin?: Date;
  hashRefreshToken?: string;
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
