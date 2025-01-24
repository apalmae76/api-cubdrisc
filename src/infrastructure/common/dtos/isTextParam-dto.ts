import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import {
  RE_FULL_NAME,
  RE_TEXT,
} from 'src/infrastructure/common/utils/constants';

export function IsTextParam(
  description: string,
  example: string,
  required: boolean,
  minLength = 1,
  maxLength = 80,
  regExp = RE_TEXT,
) {
  if (regExp) {
    const errorMsg =
      regExp === RE_FULL_NAME
        ? 'validation.MATCH_FULL_NAME'
        : 'validation.MATCH_TEXT';
    if (required) {
      if (minLength && maxLength) {
        return applyDecorators(
          ApiProperty({ description, example, required }),
          Transform(({ value }) =>
            value && value.length ? value.trim() : value,
          ),
          IsDefined({
            message: i18nValidationMessage('validation.IS_REQUIRED'),
          }),
          Matches(regExp, {
            message: i18nValidationMessage(errorMsg, {
              min: minLength,
              max: maxLength,
            }),
          }),
          Length(minLength, maxLength, {
            message: i18nValidationMessage('validation.LENGTH'),
          }),
        );
      } else {
        return applyDecorators(
          ApiProperty({ description, example, required }),
          Transform(({ value }) =>
            value && value.length ? value.trim() : value,
          ),
          IsDefined({
            message: i18nValidationMessage('validation.IS_REQUIRED'),
          }),
          Matches(regExp, {
            message: i18nValidationMessage(errorMsg, {
              min: minLength,
              max: maxLength,
            }),
          }),
        );
      }
    } else {
      if (minLength && maxLength) {
        return applyDecorators(
          ApiProperty({ description, example, required }),
          Transform(({ value }) =>
            value && value.length > 0
              ? value.trim()
              : value === ''
                ? null
                : value,
          ),
          IsOptional(),
          Matches(regExp, {
            message: i18nValidationMessage(errorMsg, {
              min: minLength,
              max: maxLength,
            }),
          }),
          Length(minLength, maxLength, {
            message: i18nValidationMessage('validation.LENGTH'),
          }),
        );
      } else {
        return applyDecorators(
          ApiProperty({ description, example, required }),
          Transform(({ value }) =>
            value && value.length > 0
              ? value.trim()
              : value === ''
                ? null
                : value,
          ),
          IsOptional(),
          Matches(regExp, {
            message: i18nValidationMessage(errorMsg, {
              min: minLength,
              max: maxLength,
            }),
          }),
        );
      }
    }
  } else {
    if (required) {
      if (minLength && maxLength) {
        return applyDecorators(
          ApiProperty({ description, example, required }),
          Transform(({ value }) =>
            value && value.length ? value.trim() : value,
          ),
          IsDefined({
            message: i18nValidationMessage('validation.IS_REQUIRED'),
          }),
          IsString({
            message: i18nValidationMessage('validation.INVALID_STRING'),
          }),
          Length(minLength, maxLength, {
            message: i18nValidationMessage('validation.LENGTH'),
          }),
        );
      } else {
        return applyDecorators(
          ApiProperty({ description, example, required }),
          Transform(({ value }) =>
            value && value.length ? value.trim() : value,
          ),
          IsDefined({
            message: i18nValidationMessage('validation.IS_REQUIRED'),
          }),
          IsString({
            message: i18nValidationMessage('validation.INVALID_STRING'),
          }),
        );
      }
    } else {
      if (minLength && maxLength) {
        return applyDecorators(
          ApiProperty({ description, example, required }),
          Transform(({ value }) =>
            value && value.length > 0
              ? value.trim()
              : value === ''
                ? null
                : value,
          ),
          IsOptional(),
          IsString({
            message: i18nValidationMessage('validation.INVALID_STRING'),
          }),
          Length(minLength, maxLength, {
            message: i18nValidationMessage('validation.LENGTH'),
          }),
        );
      } else {
        return applyDecorators(
          ApiProperty({ description, example, required }),
          Transform(({ value }) =>
            value && value.length > 0
              ? value.trim()
              : value === ''
                ? null
                : value,
          ),
          IsOptional(),
          IsString({
            message: i18nValidationMessage('validation.INVALID_STRING'),
          }),
        );
      }
    }
  }
}
