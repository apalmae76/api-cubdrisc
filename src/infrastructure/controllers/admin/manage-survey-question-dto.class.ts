import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  MinLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { RE_INT_NUMBER } from 'src/infrastructure/common/utils/constants';
import { Gender, genderTypesValues } from '../profile/profile-dto.class';

export class ValidQuestionIdDto {
  @Transform(({ value }) =>
    value && RE_INT_NUMBER.test(value) ? parseInt(value) : value,
  )
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  readonly questionId: number;
}

export class ValidReferenceIdDto {
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.NOT_EMPTY') })
  @IsUUID('4', { message: i18nValidationMessage('validation.IS_UUID') })
  readonly referenceId: string;
}

export class ValidGenderDto {
  @IsEnum(Gender, {
    message: i18nValidationMessage('validation.INVALID_ENUM', {
      acepted: genderTypesValues,
    }),
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  readonly gender: string;
}

export class CreateSurveyQuestionDto {
  @ApiProperty({
    example:
      '¿ Algún miembro de su familia ha sido diagnosticado con diabetes tipo 1 o tipo 2 ?',
    required: true,
  })
  @Transform(({ value }) => value?.trim() ?? '')
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @MinLength(10, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  readonly question: string;

  @ApiProperty({
    example: true,
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsBoolean({ message: i18nValidationMessage('validation.INVALID_BOOLEAN') })
  readonly required: boolean;

  @ApiProperty({
    description: `Biological sex. Is enum type with these values: ${genderTypesValues}
    \n Used for sex optional questions. Use null value if question is not optionally by sex`,
    example: Gender.MALE,
    default: null,
    enum: Gender,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsEnum(Gender, {
    message: i18nValidationMessage('validation.INVALID_ENUM', {
      acepted: genderTypesValues,
    }),
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  readonly gender: string | null = null;
}

export class UpdateSurveyQuestionDto {
  @ApiProperty({
    example:
      '¿ Algún miembro de su familia ha sido diagnosticado con diabetes tipo 1 o tipo 2 ?',
    required: false,
  })
  @Transform(({ value }) =>
    value !== undefined ? (value?.trim() ?? '') : value,
  )
  @IsOptional()
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Length(1, 200, { message: i18nValidationMessage('validation.LENGTH') })
  question: string;

  @ApiProperty({
    example: true,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsBoolean({ message: i18nValidationMessage('validation.INVALID_BOOLEAN') })
  required: boolean;

  @ApiProperty({
    description: `Biological sex. Is enum type with these values: ${genderTypesValues}
    \n Used for sex optional questions. Use null value if question is not optionally by sex`,
    example: Gender.MALE,
    default: null,
    enum: Gender,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsEnum(Gender, {
    message: i18nValidationMessage('validation.INVALID_ENUM', {
      acepted: genderTypesValues,
    }),
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  readonly gender: string | null = null;
}

export class MoveRowDto {
  @ApiProperty({
    description: 'Reference ID',
    example: 2,
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  readonly referenceId: number;

  @ApiProperty({
    description:
      'Indicates if it goes below (true) or above (false) the sent reference',
    example: true,
    default: true,
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  belowReference: boolean;
}
