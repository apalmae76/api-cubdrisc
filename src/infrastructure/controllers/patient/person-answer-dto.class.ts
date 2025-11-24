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
  IsUUID,
  Matches,
  Min,
  Validate,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { IsTextParam } from 'src/infrastructure/common/dtos/isTextParam-dto';
import {
  RE_EMAIL_LENGTHS,
  RE_ID_CUBAN_ID,
  RE_INT_NUMBER,
  RE_PHONE_CU,
} from 'src/infrastructure/common/utils/constants';
import { formatIsoDate } from 'src/infrastructure/common/utils/format-date';
import { Gender, genderTypesValues } from '../profile/profile-dto.class';
import { ValidAge } from '../profile/valid-age-custom.class';
import { ValidDate } from '../profile/valid-date-custom.class';

export class ValidPatientIdDto {
  @Transform(({ value }) =>
    value && RE_INT_NUMBER.test(value) ? parseInt(value) : value,
  )
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  readonly patientId: number;
}

export class CreatePersonDto {
  @ApiProperty({
    description: 'identity card number',
    example: '78122398657',
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @Matches(RE_ID_CUBAN_ID, {
    message: i18nValidationMessage('validation.MATCH_CARNET_ID'),
  })
  readonly ci: string;

  @IsTextParam('firstName', 'Alexander', true)
  readonly firstName: string;

  @IsTextParam('middleName', null, false)
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
}

export class CreatePersonSurveyDto extends CreatePersonDto {
  @ApiProperty({
    description: 'Survey ID',
    type: 'integer',
    example: 4,
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  readonly surveyId: number;

  @ApiProperty({
    description: 'State',
    type: 'integer',
    example: 10,
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  readonly stateId: number;

  @ApiProperty({
    example: '+5358056644',
    description: 'Phone number with country code',
    required: true,
  })
  @Transform(({ value }) =>
    (value?.trim() ?? '') === '' ? null : value.replace(/[\s]/g, ''),
  )
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Matches(RE_PHONE_CU, {
    message: i18nValidationMessage('validation.MATCH_PHONE'),
  })
  phone: string;

  @ApiProperty({
    example: 'pepe@nauta.cu',
    description: 'E-Mail adress',
    required: true,
  })
  @Transform(({ value }) =>
    (value?.trim().length ?? 0) === 0 ? null : value.trim().toLowerCase(),
  )
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  @Matches(RE_EMAIL_LENGTHS, {
    message: i18nValidationMessage('validation.MATCH_EMAIL_LENGTHS'),
  })
  email: string;
}

export class PatchPersonDto {
  @ApiProperty({
    description: 'identity card number',
    example: '78122398657',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @Matches(RE_ID_CUBAN_ID, {
    message: i18nValidationMessage('validation.MATCH_CARNET_ID'),
  })
  readonly ci: string;

  @IsTextParam('firstName', 'Alexander', false)
  readonly firstName: string;

  @IsTextParam('middleName', null, false)
  readonly middleName?: string | null;

  @IsTextParam('lastName', 'Rodríguez', false)
  readonly lastName: string;

  @IsTextParam('secondLastName', 'González', false)
  readonly secondLastName: string;

  @ApiProperty({
    description: 'dateOfBirth',
    example: '1976-12-11',
    format: 'date',
    required: false,
  })
  @Transform(({ value }) => (value ? formatIsoDate(value) : undefined))
  @IsOptional()
  @Validate(ValidDate, ['update'])
  @Validate(ValidAge)
  readonly dateOfBirth: Date;

  @ApiProperty({
    description: `Biological sex. Is enum type with these values: ${genderTypesValues}`,
    example: Gender.MALE,
    enum: Gender,
    required: false,
  })
  @IsOptional()
  @IsEnum(Gender, {
    message: i18nValidationMessage('validation.INVALID_ENUM', {
      acepted: genderTypesValues,
    }),
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  readonly gender: string;
}

export class ReferenceIdDto {
  @ApiProperty({
    description: `\n@IMPORTANT@\n
    - Allways send this param as a reference of the user on consecutive request. Acts as respose test flow identifier
    `,
    required: true,
    example: '9d77c4db-ccec-4434-9764-e86d685e7b86',
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.NOT_EMPTY') })
  @IsUUID('4', { message: i18nValidationMessage('validation.IS_UUID') })
  readonly referenceId: string;
}

export class PatchPersonSurveyDto extends PatchPersonDto {
  @ApiProperty({
    description: `\n@IMPORTANT@\n
    - Ignore this param on the first request to this endpoint; you will get it in the response body of that request
    - Allways send this param as a reference of the user on consecutive request. Acts as respose test flow identifier
    `,
    required: true,
    example: '9d77c4db-ccec-4434-9764-e86d685e7b86',
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.NOT_EMPTY') })
  @IsUUID('4', { message: i18nValidationMessage('validation.IS_UUID') })
  readonly referenceId: string;

  @ApiProperty({
    description: 'State',
    type: 'integer',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  readonly stateId: number;

  @ApiProperty({
    example: '+5358056644',
    description: 'Phone number with country code',
    required: false,
  })
  @Transform(({ value }) =>
    (value?.trim() ?? '') === '' ? null : value.replace(/[\s]/g, ''),
  )
  @IsOptional()
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Matches(RE_PHONE_CU, {
    message: i18nValidationMessage('validation.MATCH_PHONE'),
  })
  phone: string;

  @ApiProperty({
    example: 'pepe@nauta.cu',
    description: 'E-Mail adress',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) =>
    (value?.trim().length ?? 0) === 0 ? null : value.trim().toLowerCase(),
  )
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  @Matches(RE_EMAIL_LENGTHS, {
    message: i18nValidationMessage('validation.MATCH_EMAIL_LENGTHS'),
  })
  email: string;
}

export class PutAnswerDto {
  @ApiProperty({
    description: `respose test flow identifier`,
    required: true,
    example: '9d77c4db-ccec-4434-9764-e86d685e7b86',
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.NOT_EMPTY') })
  @IsUUID('4', { message: i18nValidationMessage('validation.IS_UUID') })
  readonly referenceId: string;

  @ApiProperty({
    description: `answer id to save`,
    example: 345,
    required: true,
  })
  @Transform(({ value }) =>
    value && RE_INT_NUMBER.test(value) ? parseInt(value) : value,
  )
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  readonly answerId: number;
}
