import { BadRequestException } from '@nestjs/common';
import { OperatorsActionCreateModel } from 'src/domain/model/operatorsActions';
import { UserCreateModel } from 'src/domain/model/user';
import { UseCaseLogger } from 'src/infrastructure/common/decorators/logger.decorator';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { EOperatorsActions } from 'src/infrastructure/common/utils/constants';
import { AuthUser } from 'src/infrastructure/controllers/auth/authUser.interface';
import { EAppRoles } from 'src/infrastructure/controllers/auth/role.enum';
import { ProfileUserDto } from 'src/infrastructure/controllers/profile/profile-dto.class';
import { ProfileUserPresenter } from 'src/infrastructure/controllers/profile/profile.presenter';
import { DatabaseOperatorsActionsRepository } from 'src/infrastructure/repositories/operatorsActions.repository';
import { DatabaseUserRepository } from 'src/infrastructure/repositories/user.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class CreateUserUseCases extends UseCaseBase {
  constructor(
    private readonly userRepo: DatabaseUserRepository,
    private readonly operActionRepo: DatabaseOperatorsActionsRepository,
    protected readonly dataSource: DataSource,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.context = `${CreateUserUseCases.name}.`;
  }

  @UseCaseLogger()
  async execute(
    adminUser: AuthUser,
    userData: ProfileUserDto,
  ): Promise<BaseResponsePresenter<ProfileUserPresenter>> {
    const toCreateUser = await this.validateUser(adminUser, userData);
    const ceatedUser = await this.dataSource.transaction(async (em) => {
      const result = await this.userRepo.create(toCreateUser, em);
      const opPayload: OperatorsActionCreateModel = {
        operatorId: adminUser.id,
        toUserId: result.id,
        actionId: EOperatorsActions.USER_CREATE,
        reason: `Eliminar registro de usuario: ${result}`,
        details: result,
      };
      await this.operActionRepo.create(opPayload, em);
      return result;
    });
    const jsonIds = `{"userId":"${ceatedUser.id}","email":"${ceatedUser.email}"}`;
    return new BaseResponsePresenter(
      `messages.admin.USER_CREATED_SUCESSFULLY|${jsonIds}`,
      new ProfileUserPresenter(ceatedUser),
    );
  }

  private async validateUser(
    adminUser: AuthUser,
    userData: ProfileUserDto,
  ): Promise<UserCreateModel | null> {
    const arePhoneAndEmailValids = await this.userRepo.areCiOrPhoneOrEmailInUse(
      userData.ci,
      userData.phone,
      userData.email,
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

    const newUser: UserCreateModel = {
      ...userData,
      roles: [EAppRoles.MEDIC],
    };
    return newUser;
  }
}
