import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsInt,
  IsNotEmpty,
  Length,
  Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { RE_INT_NUMBER } from 'src/infrastructure/common/utils/constants';
import {
  EAppRoles,
  cRolesAppGrantAccess,
} from 'src/infrastructure/controllers/auth/role.enum';

export class ValidUserIdDto {
  @Transform(({ value }) =>
    value && RE_INT_NUMBER.test(value) ? parseInt(value) : value,
  )
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  readonly toUserId: number;
}

export class ValidRoleDto {
  @IsEnum(EAppRoles, {
    message: i18nValidationMessage('validation.INVALID_ENUM', {
      acepted: cRolesAppGrantAccess.panel,
    }),
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  readonly role: string;
}

export class ValidCountryIdDto {
  @Transform(({ value }) =>
    value && RE_INT_NUMBER.test(value) ? parseInt(value) : value,
  )
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  readonly countryId: number;
}

export class LockUserDto {
  @ApiProperty({
    description: 'Reason why the user has been locked / unlocked',
    example: 'It has many operations purchase of services without paying',
    required: true,
  })
  @Transform(({ value }) => (value && value.length ? value.trim() : null))
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @Length(1, 255, { message: i18nValidationMessage('validation.LENGTH') })
  readonly reason: string;
}

export class VerifyUserDto {
  @ApiProperty({
    description: 'Reason to set user to verify next payments',
    example: 'has suspicious payment transactions',
    required: true,
  })
  @Transform(({ value }) => (value && value.length ? value.trim() : null))
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @Length(1, 255, { message: i18nValidationMessage('validation.LENGTH') })
  readonly reason: string;
}
