import { UseCaseLogger } from 'src/infrastructure/common/decorators/logger.decorator';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import {
  GetStatesPresenter,
  StatesPresenter,
} from 'src/infrastructure/controllers/nomenclatures/nomenclatures.presenter';
import { DatabaseStateRepository } from 'src/infrastructure/repositories/state.repository';
import { IApiLogger } from 'src/infrastructure/services/logger/logger.interface';
import { API_LOGGER_KEY } from 'src/infrastructure/services/logger/logger.module';
import { InjectWithToken } from 'src/infrastructure/usecases-proxy/plugin/decorators/inject-with-token.decorator';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class TerritoriesUseCases extends UseCaseBase {
  constructor(
    private readonly stateRepo: DatabaseStateRepository,
    @InjectWithToken(API_LOGGER_KEY) protected readonly logger: IApiLogger,
  ) {
    super(logger);
    this.context = `${TerritoriesUseCases.name}.`;
  }

  @UseCaseLogger()
  async getStates(): Promise<GetStatesPresenter> {
    const response = await this.stateRepo.getAll();
    const states = response.map((item) => new StatesPresenter(item));
    const total = states.length ?? 0;
    return new BaseResponsePresenter('AUTO', { states, total });
  }
}
