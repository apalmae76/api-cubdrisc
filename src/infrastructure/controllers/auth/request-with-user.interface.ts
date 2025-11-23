import { Request } from 'express';
import { EAppRoles } from './role.enum';

export interface RequestWithUser extends Request {
  user: {
    id: string;
    roles: EAppRoles[];

    // otras propiedades del usuario aquí
  };
}
