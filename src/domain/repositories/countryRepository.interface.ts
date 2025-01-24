import { CountryModel } from '../model/country';
import { StatesQueryParams } from './stateRepository.interface';

export interface CountryQueryParams {
  description?: string;
  orderDir?: string;
  limit?: string;
}

export interface CitiesQueryParams extends StatesQueryParams {
  countryId: string;
}

export interface ICountryRepository {
  countryExistOrGetError(countryId: number): Promise<string>;
  ensureExistOrFail(countryId: number): Promise<void>;
  get(countryId: number): Promise<CountryModel>;
  getByQuery(query: CountryQueryParams): Promise<CountryModel[]>;
  getIso2ByIdOrFail(countryId: number): Promise<string>;
  getIdByIso2OrCode(iso2: string): Promise<number>;
}
