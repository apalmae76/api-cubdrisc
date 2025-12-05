import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDefined,
  IsNotEmpty,
  Length,
  ValidateIf,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class DiagnosePersonDto {
  @ApiProperty({
    description: 'Service availability',
    example: true,
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  readonly diagnosed: boolean = true;

  @ApiProperty({
    description: 'reason: Required if diagnosed is false',
    example: 'Service under construction',
    required: false,
  })
  @ValidateIf((o) => o.diagnosed === false)
  @IsDefined({
    message: i18nValidationMessage(
      'validation.person_survey.MISSING_DIAGNOSE_REMOVE_REASON',
    ),
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'validation.person_survey.MISSING_DIAGNOSE_REMOVE_REASON',
    ),
  })
  @Length(1, 255, { message: i18nValidationMessage('validation.LENGTH') })
  readonly reason: string | null = null;
}
