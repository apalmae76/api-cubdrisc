import { SetMetadata } from '@nestjs/common';
import { EAppRoles } from 'src/infrastructure/controllers/auth/role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: EAppRoles[]) => SetMetadata(ROLES_KEY, roles);
