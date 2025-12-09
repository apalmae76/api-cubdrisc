import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { EAppTypes } from 'src/infrastructure/common/utils/constants';
import { DatabaseUserRepository } from 'src/infrastructure/repositories/user.repository';
import { IApiLogger } from 'src/infrastructure/services/logger/logger.interface';
import { API_LOGGER_KEY } from 'src/infrastructure/services/logger/logger.module';
import { InjectWithToken } from 'src/infrastructure/usecases-proxy/plugin/decorators/inject-with-token.decorator';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class LogoutUseCases extends UseCaseBase {
  constructor(
    protected readonly userRepo: DatabaseUserRepository,
    private readonly dataSource: DataSource,
    @InjectWithToken(API_LOGGER_KEY) protected readonly logger: IApiLogger,
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
