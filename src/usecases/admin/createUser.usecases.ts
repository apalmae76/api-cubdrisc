import { BadRequestException } from '@nestjs/common';
import { UserModel } from 'src/domain/model/user';
import { UseCaseLogger } from 'src/infrastructure/common/decorators/logger.decorator';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { AuthUser } from 'src/infrastructure/controllers/auth/authUser.interface';
import { EAppRoles } from 'src/infrastructure/controllers/auth/role.enum';
import { ProfileUserDto } from 'src/infrastructure/controllers/profile/profile-dto.class';
import { ProfileUserPresenter } from 'src/infrastructure/controllers/profile/profile.presenter';
import { DatabaseUserRepository } from 'src/infrastructure/repositories/user.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class CreateUserUseCases extends UseCaseBase {
  constructor(
    private readonly userRepo: DatabaseUserRepository,
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
      return await this.userRepo.create(toCreateUser, em);
    });
    return new BaseResponsePresenter(
      `messages.admin.USER_CREATED_SUCESSFULLY|{"email":"${userData.email}"}`,
      new ProfileUserPresenter(ceatedUser),
    );
  }

  private async validateUser(
    adminUser: AuthUser,
    userData: ProfileUserDto,
  ): Promise<UserModel | null> {
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

    const newUser: UserModel = {
      ...userData,
      id: 0,
      roles: [EAppRoles.MEDIC],
    };
    return newUser;
  }
}
