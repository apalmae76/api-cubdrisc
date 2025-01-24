import { ERefreshMode } from 'src/infrastructure/repositories/city.repository';
import { CityModel } from '../model/city';
import { StatesQueryParams } from './stateRepository.interface';

export interface CityQueryParams extends StatesQueryParams {
  stateId: string;
}

export interface ICityRepository {
  cityExistOrGetError(
    countryId: number,
    stateId: number,
    cityId: number,
    refreshMode?: ERefreshMode,
  ): Promise<string>;
  ensureExistOrFail(
    countryId: number,
    stateId: number,
    cityId: number,
  ): Promise<void>;
  getByQuery(query: CityQueryParams): Promise<CityModel[]>;
  getCityNameOrFail(
    countryId: number,
    stateId: number,
    cityId: number,
  ): Promise<string>;
  get(
    countryId: number,
    stateId: number,
    cityId: number,
    failIfNotExist: boolean,
  ): Promise<CityModel>;
  getIdByName(
    countryId: number,
    stateId: number,
    name: string,
  ): Promise<number>;
}
