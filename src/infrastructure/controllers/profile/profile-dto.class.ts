import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  Validate,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { IsTextParam } from 'src/infrastructure/common/dtos/isTextParam-dto';
import {
  RE_EMAIL_LENGTHS,
  RE_ID_CUBAN_ID,
  RE_ISO_DATE,
  RE_OTP,
  RE_PHONE_CU,
} from 'src/infrastructure/common/utils/constants';
import { formatIsoDate } from 'src/infrastructure/common/utils/format-date';
import { ValidAge } from './valid-age-custom.class';
import { ValidDate } from './valid-date-custom.class';

export enum Gender {
  MALE = 'Masculino',
  FEMALE = 'Femenino',
}

export const genderTypesValues = Object.values(Gender)
  .map((v) => `"${v}"`)
  .join(', ');

export class ProfileUserDto {
  @ApiProperty({
    description: 'Accepts 11 digits',
    example: '90102455443',
    required: true,
  })
  @Matches(RE_ID_CUBAN_ID, {
    message: i18nValidationMessage('validation.MATCH_CARNET_ID'),
  })
  readonly ci: string | null;

  @IsTextParam('firstName', 'Alexander', true)
  readonly firstName: string;

  @IsTextParam('middleName', null, false)
  @Transform(({ value }) =>
    (value?.trim() ?? '') === '' ||
      (value?.trim()?.toUpperCase() ?? '') === 'NULL'
      ? null
      : value?.trim(),
  )
  @IsOptional()
  readonly middleName?: string | null;

  @IsTextParam('lastName', 'Rodríguez', true)
  readonly lastName: string;

  @IsTextParam('secondLastName', 'González', false)
  readonly secondLastName: string;

  @ApiProperty({
    description: 'dateOfBirth',
    example: '1976-12-11',
    required: true,
    format: 'date',
  })
  @Transform(({ value }) =>
    value && RE_ISO_DATE.test(value) ? formatIsoDate(value, true) : value,
  )
  @IsDefined({
    message: i18nValidationMessage('validation.IS_DEFINED'),
  })
  @Validate(ValidDate, ['update'])
  @Validate(ValidAge)
  readonly dateOfBirth: Date;

  @ApiProperty({
    description: `Biological sex. Is enum type with these values: ${genderTypesValues}`,
    example: Gender.MALE,
    enum: Gender,
    required: true,
  })
  @IsEnum(Gender, {
    message: i18nValidationMessage('validation.INVALID_ENUM', {
      acepted: genderTypesValues,
    }),
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  readonly gender: string;

  @ApiProperty({ example: 'pepe@tesis.edu', description: 'E-Mail adress' })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  @Matches(RE_EMAIL_LENGTHS, {
    message: i18nValidationMessage('validation.MATCH_EMAIL_LENGTHS'),
  })
  email: string;

  @ApiProperty({
    example: '+5358052791',
    description: 'Phone number with country code',
  })
  @Transform(({ value }) => {
    if ((value?.trim() ?? '') === '') {
      return null;
    }
    return value.replace(/[^+\d]/g, '');
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @Matches(RE_PHONE_CU, {
    message: i18nValidationMessage('validation.MATCH_PHONE_CU'),
  })
  phone: string;

  @ApiProperty({
    example: 1,
    description: 'Medical specialty ID',
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  medicalSpecialtyId: number;
}

export class UpdateEmailOTPDto {
  @ApiProperty({ example: '567890', description: 'OTP code' })
  @IsOptional()
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Matches(RE_OTP, {
    message: i18nValidationMessage('validation.MATCH_OTP_CODE'),
  })
  otpCode: string;

  @ApiProperty({ example: 'pepe@tesis.edu', description: 'E-Mail adress' })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  @Matches(RE_EMAIL_LENGTHS, {
    message: i18nValidationMessage('validation.MATCH_EMAIL_LENGTHS'),
  })
  email: string;
}

export class UpdatePhoneOTPDto {
  @ApiProperty({
    example: '567890',
    description: 'OTP code',
  })
  @IsOptional()
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Matches(RE_OTP, {
    message: i18nValidationMessage('validation.MATCH_OTP_CODE'),
  })
  otpCode: string;

  @ApiProperty({
    example: '+16545141990',
    description: 'Phone number with country code',
  })
  @Transform(({ value }) => value.replace(/[\s]/g, ''))
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @Matches(RE_PHONE_CU, {
    message: i18nValidationMessage('validation.MATCH_PHONE_CU'),
  })
  phone: string;
}

export class VerifyEmailOTPDto {
  @ApiProperty({ example: 'pepe@cubamax.us', description: 'E-Mail adress' })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  @Matches(RE_EMAIL_LENGTHS, {
    message: i18nValidationMessage('validation.MATCH_EMAIL_LENGTHS'),
  })
  email: string;

  @ApiProperty({
    example: '567890',
    description: 'OTP code',
    required: false,
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Matches(RE_OTP, {
    message: i18nValidationMessage('validation.MATCH_OTP_CODE'),
  })
  otpCode: string;
}
