import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray } from 'class-validator';
import { CountryModel } from 'src/domain/model/country';
import { MedicalSpecialtyModel } from 'src/domain/model/medicalSpecialty';
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
    type: () => CountriesPresenter,
    isArray: true,
  })
  @IsArray()
  @Type(() => CountriesPresenter)
  countries: CountriesPresenter[];

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
    this.state_code = data.code;
  }
}

class AStatesPresenter {
  @ApiProperty({
    description: 'States list data',
    type: () => StatesPresenter,
    isArray: true,
  })
  @IsArray()
  @Type(() => StatesPresenter)
  states: StatesPresenter[];

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

export class MedicalSpecialtiesPresenter {
  @ApiProperty()
  key: string;
  @ApiProperty()
  value: string;

  constructor(data: MedicalSpecialtyModel) {
    this.key = `${data.id}`;
    this.value = data.name;
  }
}

class AMedicalSpecialtiesPresenter {
  @ApiProperty({
    description: 'Cities list data',
    type: () => MedicalSpecialtiesPresenter,
    isArray: true,
  })
  @IsArray()
  @Type(() => MedicalSpecialtiesPresenter)
  medSpecialties: MedicalSpecialtiesPresenter[];

  @ApiProperty()
  total: number;
}

export class GetMedicalSpecialtiesPresenter extends BaseResponsePresenter<AMedicalSpecialtiesPresenter> {
  @ApiProperty({
    description: 'Medical specialties data',
    type: AMedicalSpecialtiesPresenter,
  })
  @Type(() => AMedicalSpecialtiesPresenter)
  data: AMedicalSpecialtiesPresenter;
}
