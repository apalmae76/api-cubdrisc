import { Transform } from 'class-transformer';
import { IsDefined, IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { RE_INT_NUMBER, RE_INT_NUMBER_INCLUDE_0 } from '../utils/constants';

export class ParamUuidDto {
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsUUID('4', { message: i18nValidationMessage('validation.IS_UUID') })
  readonly id: string;
}

export class ParamString {
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  readonly id: string;
}

export class ParamNumberIdDto {
  @Transform(({ value }) =>
    value && RE_INT_NUMBER.test(value) ? parseInt(value) : value,
  )
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  readonly id: number;
}

export class ParamNumberIdValidMin0Dto {
  @Transform(({ value }) =>
    RE_INT_NUMBER_INCLUDE_0.test(value) ? parseInt(value) : value,
  )
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(0, { message: i18nValidationMessage('validation.MIN') })
  readonly id: number;
}
