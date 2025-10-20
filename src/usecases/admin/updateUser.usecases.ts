import { BadRequestException } from '@nestjs/common';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { AuthUser } from 'src/infrastructure/controllers/auth/authUser.interface';
import { ProfileUserDto } from 'src/infrastructure/controllers/profile/profile-dto.class';
import { ProfileUserPresenter } from 'src/infrastructure/controllers/profile/profile.presenter';
import { DatabaseUserRepository } from 'src/infrastructure/repositories/user.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class UpdateUserUseCases extends UseCaseBase {
  constructor(
    private readonly userRepo: DatabaseUserRepository,
    protected readonly dataSource: DataSource,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.context = `${UpdateUserUseCases.name}.`;
  }

  async execute(
    adminUser: AuthUser,
    toUserId: number,
    userData: ProfileUserDto,
  ): Promise<BaseResponsePresenter<ProfileUserPresenter>> {
    const context = `${this.context}execute`;
    this.logger.debug(`${this.contextTitle}: starting`, {
      context,
      adminUserId: adminUser ? adminUser.id : 'NULL',
      data: userData,
    });
    try {
      await this.validateUser(adminUser, toUserId, userData);

      const updUser = await this.dataSource.transaction(async (em) => {
        return await this.userRepo.updateIfExistOrFail(toUserId, userData, em);
      });
      this.logger.debug(`${this.contextTitle}: finish`, {
        context,
        adminUserId: adminUser ? adminUser.id : 'NULL',
        result: updUser,
      });

      const response = await this.getUserProfileInfo(toUserId);
      return new BaseResponsePresenter(
        `messages.admin.USER_UPDATED_SUCESSFULLY|{"email":"${response.email}"}`,
        response,
      );
    } catch (er: unknown) {
      await this.personalizeError(er, context);
    }
  }

  private async validateUser(
    adminUser: AuthUser,
    toUserId: number,
    userData: ProfileUserDto,
  ): Promise<string | null> {
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
    return null;
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
}
