import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import {
  RE_INT_NUMBER,
  RE_INT_NUMBER_INCLUDE_0,
} from 'src/infrastructure/common/utils/constants';

export class ValidAnswerIdDto {
  @Transform(({ value }) =>
    value && RE_INT_NUMBER.test(value) ? parseInt(value) : value,
  )
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  readonly answerId: number;
}

export class CreateSurveyQuestionAnswerDto {
  @ApiProperty({
    example: '',
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @MinLength(10, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  answer: string;

  @ApiProperty({
    example: '',
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @MinLength(10, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  educationalTip: string;

  @Transform(({ value }) =>
    value && RE_INT_NUMBER_INCLUDE_0.test(value) ? parseInt(value) : value,
  )
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(0, { message: i18nValidationMessage('validation.MIN') })
  @Max(5, { message: i18nValidationMessage('validation.MAX') })
  readonly value: number;
}

export class UpdateSurveyQuestionAnswerDto {
  @ApiProperty({
    example: '',
    required: false,
  })
  @IsOptional()
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Length(1, 200, {
    message: i18nValidationMessage(
      'validation.INVALID_LENGTH, maximum:100, minimum:1',
    ),
  })
  answer?: string;

  @ApiProperty({
    example: '',
    required: false,
  })
  @IsOptional()
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Length(1, 200, {
    message: i18nValidationMessage(
      'validation.INVALID_LENGTH, maximum:100, minimum:1',
    ),
  })
  educationalTip?: string;

  @Transform(({ value }) =>
    value && RE_INT_NUMBER_INCLUDE_0.test(value) ? parseInt(value) : value,
  )
  @IsOptional()
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(0, { message: i18nValidationMessage('validation.MIN') })
  @Max(5, { message: i18nValidationMessage('validation.MAX') })
  readonly value: number;
}
