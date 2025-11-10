import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { RE_INT_NUMBER } from 'src/infrastructure/common/utils/constants';

export class ValidSurveyIdDto {
  @Transform(({ value }) =>
    value && RE_INT_NUMBER.test(value) ? parseInt(value) : value,
  )
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  readonly surveyId: number;
}

export class CreateSurveyDto {
  @ApiProperty({
    example: '',
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Length(1, 200, { message: i18nValidationMessage('validation.LENGTH') })
  name: string;

  @ApiProperty({
    example: '',
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Length(1, 200, { message: i18nValidationMessage('validation.LENGTH') })
  description: string;
}

export class UpdateSurveyDto {
  @ApiProperty({
    example: '',
    required: false,
  })
  @IsOptional()
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Length(1, 200, { message: i18nValidationMessage('validation.LENGTH') })
  name: string;

  @ApiProperty({
    example: '',
    required: false,
  })
  @IsOptional()
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Length(1, 200, { message: i18nValidationMessage('validation.LENGTH') })
  description: string;

  @ApiProperty({
    example: '',
    required: false,
  })
  @IsOptional()
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsBoolean({ message: i18nValidationMessage('validation.INVALID_BOOLEAN') })
  active: boolean;
}

export class SetActiveSurveyDto {
  @ApiProperty({
    example: '',
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsBoolean({ message: i18nValidationMessage('validation.INVALID_BOOLEAN') })
  active: boolean;
}
