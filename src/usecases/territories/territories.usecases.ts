import { UseCaseLogger } from 'src/infrastructure/common/decorators/logger.decorator';
import { StatesPresenter } from 'src/infrastructure/controllers/nomenclatures/nomenclatures.presenter';
import { DatabaseStateRepository } from 'src/infrastructure/repositories/state.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class TerritoriesUseCases extends UseCaseBase {
  constructor(
    private readonly stateRepo: DatabaseStateRepository,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.context = `${TerritoriesUseCases.name}.`;
  }

  @UseCaseLogger()
  async getStates(): Promise<StatesPresenter[]> {
    const response = await this.stateRepo.getAll();
    return response.map((item) => new StatesPresenter(item));
  }
}
