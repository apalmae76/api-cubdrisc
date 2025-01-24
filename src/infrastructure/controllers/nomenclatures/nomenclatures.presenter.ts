import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray } from 'class-validator';
import { CityModel } from 'src/domain/model/city';
import { CountryModel } from 'src/domain/model/country';
import { StateModel } from 'src/domain/model/state';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
export class CountriesPresenter {
  @ApiProperty()
  key: string;
  @ApiProperty()
  value: string;
  @ApiProperty()
  alpha_code2: string;

  constructor(data: CountryModel) {
    this.key = `${data.id}`;
    this.value = data.name;
    this.alpha_code2 = data.iso2;
  }
}

class ACountriesPresenter {
  @ApiProperty({
    description: 'Countries list data',
    type: [CountriesPresenter],
  })
  @IsArray()
  @Type(() => CountriesPresenter)
  countries: [CountriesPresenter];

  @ApiProperty()
  total: number;
}
export class GetCountriesPresenter extends BaseResponsePresenter<ACountriesPresenter> {
  @ApiProperty({
    description: 'Countries data',
    type: ACountriesPresenter,
  })
  @Type(() => ACountriesPresenter)
  data: ACountriesPresenter;
}
export class StatesPresenter {
  @ApiProperty()
  key: string;
  @ApiProperty()
  value: string;
  @ApiProperty()
  state_code: string;

  constructor(data: StateModel) {
    this.key = `${data.id}`;
    this.value = data.name;
    this.state_code = data.stateCode;
  }
}

class AStatesPresenter {
  @ApiProperty({
    description: 'States list data',
    type: [StatesPresenter],
  })
  @IsArray()
  @Type(() => StatesPresenter)
  states: [StatesPresenter];

  @ApiProperty()
  total: number;
}

export class GetStatesPresenter extends BaseResponsePresenter<AStatesPresenter> {
  @ApiProperty({
    description: 'States data',
    type: AStatesPresenter,
  })
  @Type(() => AStatesPresenter)
  data: AStatesPresenter;
}

export class CitiesPresenter {
  @ApiProperty()
  key: string;
  @ApiProperty()
  value: string;

  constructor(data: CityModel) {
    this.key = `${data.id}`;
    this.value = data.name;
  }
}

class ACitiesPresenter {
  @ApiProperty({
    description: 'Cities list data',
    type: [CitiesPresenter],
  })
  @IsArray()
  @Type(() => CitiesPresenter)
  cities: [CitiesPresenter];

  @ApiProperty()
  total: number;
}

export class GetCitiesPresenter extends BaseResponsePresenter<ACitiesPresenter> {
  @ApiProperty({
    description: 'Cities data',
    type: ACitiesPresenter,
  })
  @Type(() => ACitiesPresenter)
  data: ACitiesPresenter;
}
