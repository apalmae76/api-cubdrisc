import { UseCaseLogger } from 'src/infrastructure/common/decorators/logger.decorator';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import {
  GetMedicalSpecialtiesPresenter,
  MedicalSpecialtiesPresenter,
} from 'src/infrastructure/controllers/nomenclatures/nomenclatures.presenter';
import { DatabaseMedicalSpecialtyRepository } from 'src/infrastructure/repositories/medical-specialty.repository';
import { IApiLogger } from 'src/infrastructure/services/logger/logger.interface';
import { API_LOGGER_KEY } from 'src/infrastructure/services/logger/logger.module';
import { InjectWithToken } from 'src/infrastructure/usecases-proxy/plugin/decorators/inject-with-token.decorator';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class MedicalSpecialtiesUseCases extends UseCaseBase {
  constructor(
    private readonly medSpecRepo: DatabaseMedicalSpecialtyRepository,
    @InjectWithToken(API_LOGGER_KEY) protected readonly logger: IApiLogger,
  ) {
    super(logger);
    this.context = `${MedicalSpecialtiesUseCases.name}.`;
  }

  @UseCaseLogger()
  async getMedicalSpecialties(): Promise<GetMedicalSpecialtiesPresenter> {
    const response = await this.medSpecRepo.getAll();
    const medSpecs = response.map(
      (item) => new MedicalSpecialtiesPresenter(item),
    );
    const total = medSpecs?.length ?? 0;
    return new BaseResponsePresenter('AUTO', {
      medSpecialties: medSpecs,
      total,
    });
  }
}
