import { BadRequestException } from '@nestjs/common';
import { OperatorsActionCreateModel } from 'src/domain/model/operatorsActions';
import { UseCaseLogger } from 'src/infrastructure/common/decorators/logger.decorator';
import {
  BaseResponsePresenter,
  BooleanDataResponsePresenter,
} from 'src/infrastructure/common/dtos/baseResponse.dto';
import { EOperatorsActions } from 'src/infrastructure/common/utils/constants';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { AuthUser } from 'src/infrastructure/controllers/auth/auth-user.interface';
import { ProfileUserDto } from 'src/infrastructure/controllers/profile/profile-dto.class';
import { ProfileUserPresenter } from 'src/infrastructure/controllers/profile/profile.presenter';
import { DatabaseOperatorsActionsRepository } from 'src/infrastructure/repositories/operators-actions.repository';
import { DatabaseUserRepository } from 'src/infrastructure/repositories/user.repository';
import { IApiLogger } from 'src/infrastructure/services/logger/logger.interface';
import { API_LOGGER_KEY } from 'src/infrastructure/services/logger/logger.module';
import { InjectWithToken } from 'src/infrastructure/usecases-proxy/plugin/decorators/inject-with-token.decorator';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class UpdateUserUseCases extends UseCaseBase {
  constructor(
    private readonly userRepo: DatabaseUserRepository,
    private readonly operActionRepo: DatabaseOperatorsActionsRepository,
    private readonly appConfig: EnvironmentConfigService,
    protected readonly dataSource: DataSource,
    @InjectWithToken(API_LOGGER_KEY) protected readonly logger: IApiLogger,
  ) {
    super(logger);
    this.context = `${UpdateUserUseCases.name}.`;
  }

  @UseCaseLogger()
  async execute(
    adminUser: AuthUser,
    toUserId: number,
    userData: ProfileUserDto,
  ): Promise<BaseResponsePresenter<ProfileUserPresenter>> {
    await this.validateUser(adminUser, toUserId, userData);

    await this.dataSource.transaction(async (em) => {
      const result = await this.userRepo.updateIfExistOrFail(
        toUserId,
        userData,
        em,
      );
      const opPayload: OperatorsActionCreateModel = {
        operatorId: adminUser.id,
        actionId: EOperatorsActions.USER_UPDATE,
        reason: `Modificar registro de usuario: ${result}`,
        details: {
          id: toUserId,
          ...userData,
        },
      };
      await this.operActionRepo.create(opPayload, em);
    });
    const response = await this.getUserProfileInfo(toUserId);
    return new BaseResponsePresenter(
      `messages.admin.USER_UPDATED_SUCESSFULLY|{"email":"${response.email}"}`,
      response,
    );
  }

  private async validateUser(
    adminUser: AuthUser,
    toUserId: number,
    userData: ProfileUserDto,
  ): Promise<void> {
    const userInBd = await this.userRepo.getByIdOrFail(toUserId);
    const theyAreTheSame = this.userRepo.usersAreSame(userInBd, userData);
    if (userInBd && theyAreTheSame) {
      const error = `messages.common.VALUES_NOT_CHANGED|{"context":"updatingUserData"}`;
      throw new BadRequestException({ message: [error] });
    }
    const arePhoneAndEmailValids = await this.userRepo.areCiOrPhoneOrEmailInUse(
      userData.ci,
      userData.phone,
      userData.email,
      toUserId,
    );

    this.logger.debug('Are phone and email valids: {arePhoneAndEmailValids}', {
      adminUserId: adminUser ? adminUser.id : 'NULL',
      arePhoneAndEmailValids:
        arePhoneAndEmailValids.ci === null &&
        arePhoneAndEmailValids.phone === null &&
        arePhoneAndEmailValids.email === null,
    });

    const errors: string[] = [];
    if (arePhoneAndEmailValids.ci) {
      errors.push(arePhoneAndEmailValids.ci);
    }
    if (arePhoneAndEmailValids.phone) {
      errors.push(arePhoneAndEmailValids.phone);
    }
    if (arePhoneAndEmailValids.email) {
      errors.push(arePhoneAndEmailValids.email);
    }
    if (errors.length) {
      throw new BadRequestException({ message: errors });
    }
  }

  async getUserProfileInfo(userId: number): Promise<ProfileUserPresenter> {
    const context = `${this.context}getUserProfileInfo`;
    try {
      const user = await this.userRepo.getByIdOrFail(userId);
      return new ProfileUserPresenter(user);
    } catch (er: unknown) {
      await this.personalizeError(er, context);
    }
  }

  @UseCaseLogger()
  async delete(
    operatorId: number,
    toUserId: number,
  ): Promise<BooleanDataResponsePresenter> {
    const user = await this.userRepo.getByIdOrFail(toUserId);
    const jsonIds = `{"userId":"${toUserId}","email":"${user.email}"}`;
    if (user.deletedAt) {
      const response = new BooleanDataResponsePresenter(
        `messages.admin.USER_DELETED|${jsonIds}`,
        true,
      );
      const error = new BadRequestException({
        message: [`validation.admin.USER_ALREADY_DELETED|${jsonIds}`],
      });
      return this.handleNoChangedValuesOnUpdate(
        `${this.context}delete`,
        response,
        this.appConfig.isProductionEnv(),
        error,
      );
    }

    const result = await this.dataSource.transaction(async (em) => {
      const result = await this.userRepo.softDelete(toUserId, em);
      const opPayload: OperatorsActionCreateModel = {
        operatorId,
        actionId: EOperatorsActions.USER_DELETE,
        reason: `Eliminar registro de usuario: ${result}`,
        details: user,
      };
      await this.operActionRepo.create(opPayload, em);
      return result;
    });

    const actionMsg = result ? 'DELETED' : 'NOT_DELETED';
    return new BooleanDataResponsePresenter(
      `messages.admin.USER_${actionMsg}|${jsonIds}`,
      result,
    );
  }
}
