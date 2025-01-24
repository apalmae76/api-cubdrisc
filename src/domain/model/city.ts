export class CityCreateModel {
  name: string;
  countryId: number;
  stateId: number;
}

export class CityModel extends CityCreateModel {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}
