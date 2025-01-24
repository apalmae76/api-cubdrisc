/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { differenceInYears, isValid, parseISO } from 'date-fns';

@ValidatorConstraint({ name: 'validAge', async: false })
export class ValidAge implements ValidatorConstraintInterface {
  validate(value: string) {
    const currentDate = new Date();
    const dateOfBirth = parseISO(value);
    const age = differenceInYears(currentDate, dateOfBirth);
    if (age < 0) {
      return false;
    }
    if (age < 18) {
      return false;
    }

    return age < 96;
  }

  defaultMessage(args: ValidationArguments) {
    const value = (args as any).value;
    const currentDate = new Date();
    const dateOfBirth = parseISO(value);
    const age = isValid(dateOfBirth)
      ? differenceInYears(currentDate, dateOfBirth)
      : 0;

    if (age < 0) {
      return `validation.DATE_MAX_TODAY`;
    }
    if (age < 18) {
      return `validation.MIN_AGE|{"age":"${age}"}`;
    }

    return `validation.MAX_AGE|{"age":"${age}"}`;
  }
}
