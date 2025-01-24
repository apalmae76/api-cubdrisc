export class CountryCreateModel {
  id: number;
  name: string;
  iso3: string;
  iso2: string;
  countryCode: string;
  phoneCode: string;
}

export class CountryModel extends CountryCreateModel {
  createdAt: Date;
  updatedAt: Date;
}
