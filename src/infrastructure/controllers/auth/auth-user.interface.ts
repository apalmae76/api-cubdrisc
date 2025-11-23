import { EAppTypes } from 'src/infrastructure/common/utils/constants';
import { EAppRoles } from './role.enum';

export interface AuthUser {
  id: number;
  roles: EAppRoles[];
  deviceKey: string;
  app: EAppTypes;
  email?: string;

  // add other properties of interest to the user here
}
