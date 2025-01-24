import { StateModel } from '../model/state';
import { CountryQueryParams } from './countryRepository.interface';

export interface StatesQueryParams extends CountryQueryParams {
  countryId: string;
}

export interface IStateRepository {
  stateExistOrGetError(countryId: number, stateId: number): Promise<string>;
  ensureExistOrFail(countryId: number, stateId: number): Promise<void>;
  get(countryId: number, stateId: number): Promise<StateModel>;
  getStateNameOrFail(countryId: number, stateId: number): Promise<string>;
  getByQuery(query: StatesQueryParams): Promise<StateModel[]>;
  getIdByIso2(countryId: number, stateIso2: string): Promise<number>;
  getIdByIso2orName(countryId: number, name: string): Promise<number>;
  getStateIso2ByIdOrFail(countryId: number, stateId: number): Promise<string>;
  getAll(countryId: number, refreshMode: boolean): Promise<StateModel[]>;
}
