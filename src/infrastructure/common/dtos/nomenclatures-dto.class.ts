import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export enum Order {
  DESC = 'DESC',
  ASC = 'ASC',
}
export class GetBaseDto {
  @ApiProperty({
    description: `Allows filtering. Works like [attr] LIKE '[value]%'`,
    required: false,
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Length(1, 30, { message: i18nValidationMessage('validation.LENGTH') })
  readonly description: string;

  @ApiProperty({
    description:
      'Allows to retrieve the data ordered by the selection (DESC or ASC)',
    example: Order.ASC,
    enum: Order,
    required: false,
  })
  @IsOptional()
  @IsEnum(Order, {
    message: i18nValidationMessage('validation.INVALID_ENUM', {
      acepted: Object.values(Order)
        .map((v) => `"${v}"`)
        .join(', '),
    }),
  })
  readonly orderDir: string;

  @ApiProperty({
    description: 'Allows to specify the number of tuples to retrieve',
    example: 20,
    default: -1,
    required: false,
    type: Number,
  })
  @IsOptional()
  @IsNumberString(
    {},
    { message: i18nValidationMessage('validation.IS_NUMBER_STRING') },
  )
  readonly limit: string;
}

export class GetCountriesDto extends GetBaseDto {}
export class GetStatesDto extends GetCountriesDto {
  @ApiProperty({
    description: 'Country',
    example: 'CUBA',
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Length(2, 30, { message: i18nValidationMessage('validation.LENGTH') })
  readonly country: string;
}

export class GetCitiesDto extends GetStatesDto {
  @ApiProperty({
    description: 'State',
    example: 'villa clara',
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Length(2, 30, { message: i18nValidationMessage('validation.LENGTH') })
  readonly state: string;
}

export class GetTCountriesDto extends GetBaseDto {
  @ApiProperty({
    example: false,
    default: false,
    required: false,
    description: `Indicates to get only active in system (true) or all (false, is default value)`,
  })
  @Transform(({ value }) => (value === true || value === 'true' ? true : false))
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  justActives?: boolean;
}
export class GetTStatesDto extends GetTCountriesDto {
  @ApiProperty({
    description: 'Country',
    example: '233',
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({
    message: i18nValidationMessage('validation.IS_REQUIRED'),
  })
  @IsNumberString(
    {},
    { message: i18nValidationMessage('validation.IS_NUMBER_STRING') },
  )
  readonly countryId: string;
}

export class GetTCitiesDto extends GetTStatesDto {
  @ApiProperty({
    description: 'State',
    example: '1456',
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({
    message: i18nValidationMessage('validation.IS_REQUIRED'),
  })
  @IsNumberString(
    {},
    { message: i18nValidationMessage('validation.IS_NUMBER_STRING') },
  )
  readonly stateId: string;
}
