import { EAppTypes } from 'src/infrastructure/common/utils/constants';
import { EAppRoles } from 'src/infrastructure/controllers/auth/role.enum';

export interface TokenPayload {
  userId: number;
  app: EAppTypes;
  deviceKey: string;
  roles: EAppRoles[];
}

export interface RefreshTokenPayload {
  userId: number;
  app: EAppTypes;
  deviceKey: string;
}
