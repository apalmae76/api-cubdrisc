import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  Validate,
  ValidateIf,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { IsTextParam } from 'src/infrastructure/common/dtos/isTextParam-dto';
import {
  RE_EMAIL_LENGTHS,
  RE_OTP,
  RE_PHONE_CU,
} from 'src/infrastructure/common/utils/constants';
import { formatIsoDate } from 'src/infrastructure/common/utils/format-date';
import { Gender, genderTypesValues } from '../profile/profile-dto.class';
import { ValidAge } from '../profile/valid-age-custom.class';
import { ValidDate } from '../profile/valid-date-custom.class';

export class PhoneDto {
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

export class UserDto extends PhoneDto {
  @IsTextParam('firstName', 'Alejandro', true)
  readonly firstName: string;

  @IsOptional()
  @IsTextParam('middleName', null, false)
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
  @Transform(({ value }) => formatIsoDate(value))
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
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

  @ApiProperty({ example: 'pepe@tesis.udu', description: 'E-Mail adress' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  @Matches(RE_EMAIL_LENGTHS, {
    message: i18nValidationMessage('validation.MATCH_EMAIL_LENGTHS'),
  })
  email: string;
}

export class EmailDto {
  @ApiProperty({ example: 'pepe@tesis.edu', description: 'E-Mail adress' })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  @Matches(RE_EMAIL_LENGTHS, {
    message: i18nValidationMessage('validation.MATCH_EMAIL_LENGTHS'),
  })
  email: string;
}
export class LogginEmailOTPDto extends EmailDto {
  @ApiProperty({
    example: '567890',
    description: 'OTP code',
    required: false,
  })
  @ValidateIf((obj) => obj.otpCode)
  @Matches(RE_OTP, {
    message: i18nValidationMessage('validation.MATCH_OTP_CODE'),
  })
  otpCode?: string;
}

export class sendEmailOtpDto extends EmailDto {
  @ApiProperty()
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNumberString(
    {},
    { message: i18nValidationMessage('validation.IS_NUMBER') },
  )
  userId: number;
}

export class RegistryVerifyPhoneOTPDto extends PhoneDto {
  @ApiProperty({
    example: '567890',
    description: 'OTP code',
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({
    message: i18nValidationMessage('validation.IS_REQUIRED'),
  })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Matches(RE_OTP, {
    message: i18nValidationMessage('validation.MATCH_OTP_CODE'),
  })
  otpCode: string;
}

export class ConfirmEmailDto {
  @ApiProperty()
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @IsNotEmpty({
    message: i18nValidationMessage('validation.IS_REQUIRED'),
  })
  token: string;
}
