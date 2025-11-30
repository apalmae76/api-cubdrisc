import { GetGenericAllDto } from 'src/infrastructure/common/dtos/genericRepo-dto.class';
import { PageDto } from 'src/infrastructure/common/dtos/page.dto';
import { EntityManager } from 'typeorm';
import {
  OperatorsActionCreateModel,
  OperatorsActionModel,
  OperatorsActionPanelModel,
} from '../model/operatorsActions';

export interface IUserLockData {
  opActionId: number;
  userId: number;
  reason: string;
}

export interface IUserLockDetails {
  cards: number;
  devices: number;
}

export interface IBalanceOpActionDetails {
  initialBalance: number;
  amount: number;
  finalBalance: number;
}

export interface IOperatorsActionsRepository {
  create(
    payload: OperatorsActionCreateModel,
    em: EntityManager,
  ): Promise<OperatorsActionModel>;
  setActionDetails(
    id: number,
    details: object,
    em: EntityManager,
  ): Promise<void>;
  get(id: number): Promise<OperatorsActionModel>;
  getByQuery(
    queryDto: GetGenericAllDto,
  ): Promise<PageDto<OperatorsActionPanelModel>>;
  getOrFail(id: number): Promise<OperatorsActionModel>;
  getAll(): Promise<OperatorsActionModel[]>;
  getAllByOperator(userId: number): Promise<OperatorsActionModel[]>;
}
