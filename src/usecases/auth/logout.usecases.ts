import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { EAppTypes } from 'src/infrastructure/common/utils/constants';
import { DatabaseUserRepository } from 'src/infrastructure/repositories/user.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { DataSource } from 'typeorm';
import { UseCaseBase } from '../usecases.base';

export class LogoutUseCases extends UseCaseBase {
  constructor(
    protected readonly userRepo: DatabaseUserRepository,
    private readonly dataSource: DataSource,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.contextTitle = 'Logout ';
    this.context = `${LogoutUseCases.name}.`;
  }

  async execute(
    userId: number,
    app: EAppTypes,
  ): Promise<BaseResponsePresenter<null>> {
    const context = `${this.context}execute`;
    try {
      this.logger.debug('Starting; user with ID {userId}', { context, userId });
      await this.dataSource.transaction(async (em) => {
        await this.userRepo.removeRefreshToken(userId, app, em);
      });
      return new BaseResponsePresenter('messages.login.LOGOUT_SUCCESS');
    } catch (er: unknown) {
      await this.personalizeError(er, context);
    }
  }
}
