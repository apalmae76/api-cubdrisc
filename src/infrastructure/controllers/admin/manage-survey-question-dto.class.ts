import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  MinLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { RE_INT_NUMBER } from 'src/infrastructure/common/utils/constants';

export class ValidQuestionIdDto {
  @Transform(({ value }) =>
    value && RE_INT_NUMBER.test(value) ? parseInt(value) : value,
  )
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  readonly questionId: number;
}

export class CreateSurveyQuestionDto {
  @ApiProperty({
    example: '',
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @MinLength(10, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  question: string;

  @ApiProperty({
    example: '',
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsBoolean({ message: i18nValidationMessage('validation.INVALID_BOOLEAN') })
  required: boolean;
}

export class UpdateSurveyQuestionDto {
  @ApiProperty({
    example: '',
    required: false,
  })
  @IsOptional()
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Length(1, 200, { message: i18nValidationMessage('validation.LENGTH') })
  question: string;

  @ApiProperty({
    example: '',
    required: false,
  })
  @IsOptional()
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsBoolean({ message: i18nValidationMessage('validation.INVALID_BOOLEAN') })
  required: boolean;

  @ApiProperty({
    example: '',
    required: false,
  })
  @IsOptional()
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsBoolean({ message: i18nValidationMessage('validation.INVALID_BOOLEAN') })
  active: boolean;
}

export class SetActiveSurveyQuestionDto {
  @ApiProperty({
    example: '',
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsBoolean({ message: i18nValidationMessage('validation.INVALID_BOOLEAN') })
  active: boolean;
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
