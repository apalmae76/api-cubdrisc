import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { RE_INT_NUMBER } from 'src/infrastructure/common/utils/constants';

export class ValidRuleIdDto {
  @Transform(({ value }) =>
    value && RE_INT_NUMBER.test(value) ? parseInt(value) : value,
  )
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  readonly ruleId: number;
}

export class CreateSurveyRiskCalculationDto {
  @ApiProperty({
    example: '',
    required: false,
  })
  @Transform(({ value }) => value?.trim() ?? '')
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Length(2, 50, { message: i18nValidationMessage('validation.LENGTH') })
  label: string;

  @ApiProperty({
    example: '',
    required: true,
  })
  @Transform(({ value }) => value?.trim() ?? '')
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @MinLength(4, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  description: string;

  @ApiProperty({
    description: 'min range',
    example: 2,
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  @Min(0, { message: i18nValidationMessage('validation.MIN') })
  @Max(100, { message: i18nValidationMessage('validation.MAX') })
  readonly minRange: number;

  @ApiProperty({
    description: 'max range',
    example: 2,
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  @Min(0, { message: i18nValidationMessage('validation.MIN') })
  @Max(100, { message: i18nValidationMessage('validation.MAX') })
  readonly maxRange: number;

  @ApiProperty({
    description: 'max range',
    example: 2,
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  readonly percent: number;
}

export class UpdateSurveyRiskCalculationDto {
  @ApiProperty({
    example: '',
    required: false,
  })
  @Transform(({ value }) =>
    value !== undefined ? (value?.trim() ?? '') : value,
  )
  @IsOptional()
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Length(2, 50, { message: i18nValidationMessage('validation.LENGTH') })
  label: string;

  @ApiProperty({
    example: '',
    required: true,
  })
  @Transform(({ value }) =>
    value !== undefined ? (value?.trim() ?? '') : value,
  )
  @IsOptional()
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @MinLength(4, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  description: string;

  @ApiProperty({
    description: 'min range',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  @Min(0, { message: i18nValidationMessage('validation.MIN') })
  @Max(100, { message: i18nValidationMessage('validation.MAX') })
  readonly minRange: number;

  @ApiProperty({
    description: 'max range',
    example: 20,
    required: false,
  })
  @IsOptional()
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  @Min(0, { message: i18nValidationMessage('validation.MIN') })
  @Max(100, { message: i18nValidationMessage('validation.MAX') })
  readonly maxRange: number;

  @ApiProperty({
    description: 'max range',
    example: 20,
    required: false,
  })
  @IsOptional()
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  readonly percent: number;
}
