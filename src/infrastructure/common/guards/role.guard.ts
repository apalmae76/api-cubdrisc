import { CanActivate, ExecutionContext, mixin, Type } from '@nestjs/common';
import { AuthUser } from 'src/infrastructure/controllers/auth/authUser.interface';
import { EAppRoles } from 'src/infrastructure/controllers/auth/role.enum';
import { JwtAuthGuard } from './jwtAuth.guard';

export const RoleGuard = (role: EAppRoles): Type<CanActivate> => {
  class RoleGuardMixin extends JwtAuthGuard {
    async canActivate(context: ExecutionContext) {
      await super.canActivate(context);
      const request = context.switchToHttp().getRequest();
      const user = <AuthUser>request.user;
      return user.roles.includes(role);
    }
  }

  return mixin(RoleGuardMixin);
};

export const RolesGuard = (roles: EAppRoles[]): Type<CanActivate> => {
  class RoleGuardMixin extends JwtAuthGuard {
    async canActivate(context: ExecutionContext) {
      await super.canActivate(context);
      const request = context.switchToHttp().getRequest();
      const user = <AuthUser>request.user;
      const isRoleOk = roles.find((role) => user.roles.includes(role));
      return isRoleOk !== null;
    }
  }

  return mixin(RoleGuardMixin);
};

export default RoleGuard;
