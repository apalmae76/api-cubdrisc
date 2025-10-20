import {
  GetTCitiesDto,
  GetTCountriesDto,
  GetTStatesDto,
} from 'src/infrastructure/common/dtos/nomenclatures-dto.class';
import {
  CitiesPresenter,
  CountriesPresenter,
  StatesPresenter,
} from 'src/infrastructure/controllers/nomenclatures/nomenclatures.presenter';
import { DatabaseCityRepository } from 'src/infrastructure/repositories/city.repository';
import { DatabaseCountryRepository } from 'src/infrastructure/repositories/country.repository';
import { DatabaseStateRepository } from 'src/infrastructure/repositories/state.repository';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { UseCaseBase } from '../usecases.base';

@InjectableUseCase()
export class TerritoriesUseCases extends UseCaseBase {
  constructor(
    private readonly countryRepo: DatabaseCountryRepository,
    private readonly stateRepo: DatabaseStateRepository,
    private readonly cityRepo: DatabaseCityRepository,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.context = `${TerritoriesUseCases.name}.`;
  }

  async getCountries(dataDto: GetTCountriesDto): Promise<CountriesPresenter[]> {
    const context = `${this.context}getCountries`;
    try {
      const response = await this.countryRepo.getByQuery(dataDto);
      return response.map((item) => new CountriesPresenter(item));
    } catch (er: unknown) {
      await this.personalizeError(er, context);
    }
  }

  async getStates(dataDto: GetTStatesDto): Promise<StatesPresenter[]> {
    const context = `${this.context}getStates`;
    try {
      const response = await this.stateRepo.getByQuery(dataDto);
      return response.map((item) => new StatesPresenter(item));
    } catch (er: unknown) {
      await this.personalizeError(er, context);
    }
  }

  async getCities(dataDto: GetTCitiesDto): Promise<CitiesPresenter[]> {
    const context = `${this.context}getCities`;
    try {
      const response = await this.cityRepo.getByQuery(dataDto);
      return response.map((item) => new CitiesPresenter(item));
    } catch (er: unknown) {
      await this.personalizeError(er, context);
    }
  }
}
