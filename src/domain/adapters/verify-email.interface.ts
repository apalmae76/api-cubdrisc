import { EAppRoles } from 'src/infrastructure/controllers/auth/role.enum';

export interface IVerifyEmailServicePayload {
  userId: number;
  roles: EAppRoles[];
  email: string;
}
