import { BadRequestException } from '@nestjs/common';
import { OperatorsActionCreateModel } from 'src/domain/model/operatorsActions';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { EOperatorsActions } from 'src/infrastructure/common/utils/constants';
import { AuthUser } from 'src/infrastructure/controllers/auth/auth-user.interface';
import { DatabaseOperatorsActionsRepository } from 'src/infrastructure/repositories/operators-actions.repository';
import { DatabaseUserRepository } from 'src/infrastructure/repositories/user.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class ManageUsersRole extends UseCaseBase {
  constructor(
    private readonly userRepo: DatabaseUserRepository,
    private readonly operActionRepo: DatabaseOperatorsActionsRepository,
    protected readonly dataSource: DataSource,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.contextTitle = '[USE CASE] Manage users role ';
    this.context = `${ManageUsersRole.name}.`;
  }

  async addUserRole(
    user: AuthUser,
    toUserId: number,
    role: string,
  ): Promise<BaseResponsePresenter<boolean>> {
    const context = `${this.context}execute`;
    const operatorId = user.id;
    this.logger.debug(`Starting add role`, {
      context,
      operatorId,
      toUserId,
      role,
    });

    try {
      await this.validate(user, toUserId, role, 'add');
      const response = await this.dataSource.transaction(async (em) => {
        const payload = <OperatorsActionCreateModel>{
          operatorId,
          toUserId,
          reason: '',
          actionId: EOperatorsActions.ADD_USER_ROLE,
        };
        await this.operActionRepo.create(payload, em);
        await this.userRepo.addRole(toUserId, role, em);
        return true;
      });
      this.logger.debug(`Finish set role`, {
        result: response,
        message: 'User role was saved',
        context,
      });

      return new BaseResponsePresenter(
        'messages.admin.USER_ROLE_SUCCESSFULLY_SAVED',
        true,
      );
    } catch (er: unknown) {
      await this.personalizeError(er, context);
    }
  }

  async removeUserRole(
    user: AuthUser,
    toUserId: number,
    role: string,
  ): Promise<BaseResponsePresenter<boolean>> {
    const context = `${this.context}execute`;
    const operatorId = user.id;
    this.logger.debug(`Starting remove role`, {
      context,
      operatorId,
      toUserId,
      role,
    });

    try {
      await this.validate(user, toUserId, role, 'remove');
      const response = await this.dataSource.transaction(async (em) => {
        const payload = <OperatorsActionCreateModel>{
          operatorId,
          toUserId,
          reason: '',
          actionId: EOperatorsActions.REMOVE_USER_ROLE,
        };
        await this.operActionRepo.create(payload, em);
        await this.userRepo.removeRole(toUserId, role, em);
        return true;
      });
      this.logger.debug(`Finish remove role`, {
        result: response,
        message: 'User role was removed',
        context,
      });

      return new BaseResponsePresenter(
        'messages.admin.USER_ROLE_SUCCESSFULLY_REMOVED',
        true,
      );
    } catch (er: unknown) {
      await this.personalizeError(er, context);
    }
  }

  private async validate(
    user: AuthUser,
    toUserId: number,
    role: string,
    action: string,
  ): Promise<boolean> {
    const context = `${this.context}validate`;
    const operatorId = user.id;
    await super.isSameUser(user, toUserId, '', context, false);
    const { roles } = await this.userRepo.getByIdOrFail(toUserId);
    const userRoles = roles ? `${roles}`.replace(/[{}]/g, '').split(',') : [];

    if (action === 'add' && userRoles.includes(role)) {
      this.logger.debug(`Ends with errors, user has role`, {
        operatorId,
        toUserId,
        roleToAdd: role,
        userRoles: roles,
        context,
      });
      throw new BadRequestException({
        message: [
          `validation.admin.USER_HAS_ROL|{"toUserId":"${toUserId}","role":"${role}"}`,
        ],
      });
    } else if (action === 'remove' && !userRoles.includes(role)) {
      this.logger.debug(`Ends with errors, user does not have this role`, {
        operatorId,
        toUserId,
        roleToRemove: role,
        userRoles: roles,
        context,
      });
      throw new BadRequestException({
        message: [
          `validation.admin.USER_NOT_HAVE_ROL|{"toUserId":"${toUserId}","role":"${role}"}`,
        ],
      });
    }

    return true;
  }
}
