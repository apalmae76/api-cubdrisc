/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { RE_EXP_CARD_DATE } from './constants';

@ValidatorConstraint({ name: 'customExpYear', async: false })
export class CustomExpYear implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    const now = new Date();
    const currentYear = now.getUTCFullYear();

    return parseInt(value) >= currentYear;
  }

  defaultMessage(args: ValidationArguments) {
    return 'validation.INVALID_EXP_YEAR';
  }
}

@ValidatorConstraint({ name: 'customExpMonth', async: false })
export class CustomExpMonth implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;
    const expDateYear = (args.object as any).expDateYear;

    if (expDateYear == currentYear && parseInt(value) <= currentMonth) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'validation.INVALID_EXP_MONTH';
  }
}

@ValidatorConstraint({ name: 'customExpCardDate', async: false })
export class CustomExpCardDate implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;
    const expDateYear = parseInt(value.slice(3, 7));
    const expDateMonth = parseInt(value.slice(0, 2));

    if (!RE_EXP_CARD_DATE.test(value)) {
      return false;
    }

    if (
      expDateYear < currentYear ||
      (expDateYear == currentYear && expDateMonth < currentMonth)
    ) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;
    const value = (args.object as any).expiryDate;
    const expDateYear = parseInt(value.slice(3, 7));
    const expDateMonth = parseInt(value.slice(0, 2));

    if (!RE_EXP_CARD_DATE.test(value)) {
      return 'validation.profile.INVALID_EXP_DATE_CARD';
    }

    if (
      expDateYear < currentYear ||
      (expDateYear == currentYear && expDateMonth < currentMonth)
    ) {
      return 'validation.INVALID_EXP_DATE';
    }
  }
}
