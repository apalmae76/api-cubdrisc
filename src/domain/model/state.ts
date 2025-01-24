export class StateCreateModel {
  name: string;
  stateCode?: string;
  countryId: number;
}

export class StateModel extends StateCreateModel {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}
