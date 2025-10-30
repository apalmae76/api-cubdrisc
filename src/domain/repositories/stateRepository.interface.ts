import { StateModel } from '../model/state';

export interface IStateRepository {
  get(id: number): Promise<StateModel>;
  ensureExistOrFail(id: number): Promise<void>;
  getAll(refreshMode: boolean): Promise<StateModel[]>;
}
