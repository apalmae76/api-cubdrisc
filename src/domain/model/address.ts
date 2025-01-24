import { EntityIdName } from './user';

export class AddressCreateModel {
  userId: number;
  streetAddress: string;
  countryId: number;
  stateId: number;
  cityId: number;
  postalCode: string;
}
export class AddressModel extends AddressCreateModel {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export class AddressPanelModel {
  id: number;
  user: EntityIdName;

  streetAddress: string;
  country: number;
  state: number;
  city: number;
  postalCode: string;

  syncUpdatedAt: Date;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}

export class FullAddressModel extends AddressModel {
  city: string;
  state: string;
  stateCode?: string;
  country: string;
  countryCode?: string;
}
