import { JwtVerifyOptions } from '@nestjs/jwt';
import { EAppTypes } from 'src/infrastructure/common/utils/constants';
import { EAppRoles } from 'src/infrastructure/controllers/auth/role.enum';
import { IVerifyEmailServicePayload } from './verify-email.interface';

export interface IJwtServicePayload {
  userId: number;
  app: EAppTypes;
  roles?: EAppRoles[];
}
export interface IJwtService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  checkToken(token: string, options?: JwtVerifyOptions): Promise<any>;
  createAuthToken(
    payload: IJwtServicePayload,
    secret: string,
    expiresIn: string,
  ): string;
  createVerifyMailToken(
    payload: IVerifyEmailServicePayload,
    secret: string,
    expiresIn: string,
  ): string;
}
