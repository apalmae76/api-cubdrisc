import { GetGenericAllDto } from 'src/infrastructure/common/dtos/genericRepo-dto.class';
import { PageDto } from 'src/infrastructure/common/dtos/page.dto';
import { EntityManager } from 'typeorm';
import {
  AddressCreateModel,
  AddressModel,
  AddressPanelModel,
  FullAddressModel,
} from '../model/address';

export interface IAddressRepository {
  create(address: AddressCreateModel, em: EntityManager): Promise<AddressModel>;
  getByUserId(
    userId: number,
    useCache: boolean,
  ): Promise<FullAddressModel | null>;
  getByQuery(queryDto: GetGenericAllDto): Promise<PageDto<AddressPanelModel>>;
  getByIdForPanel(id: number): Promise<AddressPanelModel>;
  getByUserIdOrFail(userId: number): Promise<FullAddressModel>;
  getAddressesByUserId(userId: number): Promise<AddressModel[]>;
  addressAreSame(
    address1: AddressCreateModel,
    address2: AddressCreateModel,
  ): boolean;
  setAddressSyncCreateAt(id: number): Promise<void>;
  setAddressSyncUpdateAt(id: number): Promise<void>;
}
