import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export enum EEntitiesForGetEntity {
  PERSON = 'person',
  USERS = 'users',
  PATIENT = 'patient',
  USER_PHONES = 'phones',
  USER_EMAILS = 'emails',
  OPER_ACTIONS = 'operatorsActions',

  SURVEY = 'surveys',
  SURVEY_QUESTIONS = 'surveysQuestions',
  SURVEY_QUESTIONS_PA = 'surveysQuestionsPA',
}

export enum ERepoRefForGetEntity {
  perdon = 'personRepo',
  users = 'userRepo',
  patient = 'patientRepo',
  phones = 'userPhoneRepo',
  emails = 'userEmailsRepo',
  operatorsActions = 'opActionsRepo',

  surveys = 'surveysRepo',
  surveysQuestions = 'surveysQuestionsRepo',
  surveysQuestionsPA = 'surveysQuestionsPARepo',

  patientSurvey = 'patientSurveyRepo',
  patientSA = 'patientSARepo',
}

export enum EEntitiesForGetDetail {
  USERS = 'users',
  PATIENT = 'patient',
}

export enum ERepoRefForGetDetail {
  users = 'userRepo',
  patient = 'patientRepo',
}

export const allowedEntitiesForGetDetail = Object.keys(
  ERepoRefForGetDetail,
).map((v) => v);

export enum EQueryOperators {
  EQUAL = '=',
  NOT_EQUAL = '<>',
  GREATER = '>',
  GREATER_EQUAL = '>=',
  SMALLER = '<',
  SMALLER_EQUAL = '<=',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'notcontains',
  BETWEEN = 'between',
  STARTS_WITH = 'startswith',
  ENDS_WITH = 'endswith',
  IN = 'in',
}

export const operatorsList = Object.values(EQueryOperators).map(
  (v) => <string>v,
);

export const booleanOperatorsList = [
  EQueryOperators.EQUAL,
  EQueryOperators.NOT_EQUAL,
];

export const numberDateOperatorsList = [
  EQueryOperators.EQUAL,
  EQueryOperators.NOT_EQUAL,
  EQueryOperators.GREATER,
  EQueryOperators.GREATER_EQUAL,
  EQueryOperators.SMALLER,
  EQueryOperators.SMALLER_EQUAL,
  EQueryOperators.BETWEEN,
  EQueryOperators.IN,
];

export const stringOperatorsList = [
  EQueryOperators.EQUAL,
  EQueryOperators.NOT_EQUAL,
  EQueryOperators.CONTAINS,
  EQueryOperators.NOT_CONTAINS,
  EQueryOperators.STARTS_WITH,
  EQueryOperators.ENDS_WITH,
  EQueryOperators.IN,
];

const entitiesForGetEntityValues = Object.values(EEntitiesForGetEntity)
  .map((v) => v)
  .join(', ');

export class GetGenericAllDto {
  @ApiProperty({
    description: `Entity name to query: ${entitiesForGetEntityValues}`,
    example: EEntitiesForGetEntity.USERS,
    enum: EEntitiesForGetEntity,
    required: true,
  })
  @IsEnum(EEntitiesForGetEntity, {
    message: i18nValidationMessage('validation.INVALID_ENUM', {
      acepted: entitiesForGetEntityValues,
    }),
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  readonly entityName: string;

  @ApiProperty({
    description: 'Filters, string in json format',
    example: '[{"atr":"userId","op":"=","value":"12"}]',
    required: false,
  })
  @IsOptional()
  filter?: string | null;

  @ApiPropertyOptional({
    description: 'Order, string in json format',
    required: false,
  })
  @IsOptional()
  sort?: string | null;

  @ApiPropertyOptional({
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  @IsOptional()
  readonly page?: number = 1;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  @Max(100, { message: i18nValidationMessage('validation.MAX') })
  @IsOptional()
  take?: number = 10;

  get skip(): number {
    return (this.page - 1) * this.take;
  }
}

const entitiesForGetDetailValues = Object.values(EEntitiesForGetDetail)
  .map((v) => v)
  .join(', ');

export class GetGenericDetailDto {
  @ApiProperty({
    description: `Entity name to query details: ${entitiesForGetDetailValues}`,
    example: EEntitiesForGetDetail.USERS,
    enum: EEntitiesForGetDetail,
    required: true,
  })
  @IsEnum(EEntitiesForGetDetail, {
    message: i18nValidationMessage('validation.INVALID_ENUM', {
      acepted: entitiesForGetDetailValues,
    }),
  })
  @IsDefined({ message: i18nValidationMessage('validation.IS_DEFINED') })
  readonly entityName: string;

  @ApiPropertyOptional({
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_POS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  readonly id: number;
}
