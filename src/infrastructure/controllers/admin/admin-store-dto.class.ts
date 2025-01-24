import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateIf,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import {
  RE_INT_NUMBER,
  RE_INT_NUMBER_INCLUDE_0,
} from 'src/infrastructure/common/utils/constants';

export class CreateStoreCategoryDto {
  @ApiProperty({
    example: '',
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Length(1, 100, {
    message: i18nValidationMessage(
      'validation.INVALID_LENGTH, maximum:100, minimum:1',
    ),
  })
  name: string;

  @ApiProperty({
    description: 'Categorie image',
    example: '',
    required: true,
  })
  @ApiProperty({
    type: 'string',
    format: 'binary',
  })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @Type(() => Object)
  image: Express.Multer.File;
}

export class UpdateStoreCategoryDto {
  @ApiProperty({
    example: '',
    required: false,
  })
  @IsOptional()
  @ValidateIf((o: UpdateStoreCategoryDto) => o.name && o.name != '')
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Length(1, 100, {
    message: i18nValidationMessage(
      'validation.INVALID_LENGTH, maximum:100, minimum:1',
    ),
  })
  name: string;

  @ApiProperty({
    description: 'Category image',
    example: '',
    required: false,
  })
  @ApiProperty({
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  @Type(() => Object)
  image: Express.Multer.File;
}

export class GetProviderRelatedCategoriesDto {
  @ApiProperty({
    example: 10,
    required: false,
  })
  @Transform(({ value }) =>
    RE_INT_NUMBER_INCLUDE_0.test(value) ? parseInt(value) : value,
  )
  @IsOptional()
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(0, { message: i18nValidationMessage('validation.MIN') })
  localCategoryId: number;

  @ApiProperty({
    example: false,
    required: false,
    description: `When true or ignored, will return all categories, when false, return only not excluded categories`,
  })
  @Transform(({ value }) =>
    value === undefined || value === null || value === true || value === 'true'
      ? true
      : value && (value === 'false' || value === false)
        ? false
        : true,
  )
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  showIfItsExcluded: boolean = true;
}

export class SetCategoryAssociationsDto {
  @ApiProperty({
    description: 'Provider ID',
    example: 1,
    required: true,
  })
  @Transform(({ value }) =>
    value && RE_INT_NUMBER.test(value) ? parseInt(value) : value,
  )
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  providerId: number;

  @ApiProperty({
    description: 'Provider categories IDs',
    example: ['ba6e904a-2f9f-40a5-ae26-87a555ed3ab7'],
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @IsString({
    each: true,
    message: i18nValidationMessage('validation.ARRAY_ELEMENT_STRING'),
  })
  providerCategoriesIdArray: string[];
}

export class ProviderConfigDto {
  @ApiProperty({
    example: {},
    description: 'Provider config object',
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  config: object;
}

export class ExcludeProviderCategoriesDto {
  @ApiProperty({
    description: 'Provider categories of products to exclude',
    example: ['451', '51'],
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({
    each: true,
    message: i18nValidationMessage('validation.IS_REQUIRED'),
  })
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @IsString({
    each: true,
    message: i18nValidationMessage('validation.ARRAY_ELEMENT_IS_NUMBER'),
  })
  providerCategoriesIds: string[];
}

export class SetProviderCategoryToLocalCategoriesRelationDto {
  @ApiProperty({
    description: 'Provider category ID',
    example: 'ba6e904a-2f9f-40a5-ae26-87a555ed3ab7',
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  providerCategoryId: string;

  @ApiProperty({
    description: 'Local  categories IDs to link',
    example: [1, 15, 25],
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @IsInt({
    each: true,
    message: i18nValidationMessage('validation.ARRAY_ELEMENT_IS_NUMBER'),
  })
  localCategoriesIdsToLink: number[];
}

export class UpdateProviderDto {
  @ApiProperty({
    description: 'New trade name',
    example: 'Market plus',
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  @Length(1, 100, {
    message: i18nValidationMessage(
      'validation.INVALID_LENGTH, maximum:100, minimum:1',
    ),
  })
  commercialName: string;
}

export class ApproveProviderOrderDto {
  @ApiProperty({
    description: 'Local order id',
    example: 151,
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  readonly localOrderId: number;

  @ApiProperty({
    description: 'id of the user that created the order',
    example: 2,
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  readonly toUserId: number;

  @ApiProperty({
    description: 'Id of the order on the provider',
    example: '51651',
    required: true,
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_REQUIRED') })
  @IsString({ message: i18nValidationMessage('validation.INVALID_STRING') })
  readonly providerOrderId: string;
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
