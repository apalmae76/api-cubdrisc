/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isAfter, isBefore, isValid, parseISO, subYears } from 'date-fns';
import { RE_ISO_DATE } from './constants';
import { formatDateToIsoString } from './format-date';

@ValidatorConstraint({ name: 'customDateMax', async: false })
export class CustomDateSmallerThanTomorow
  implements ValidatorConstraintInterface
{
  validate(value: string, args: ValidationArguments) {
    const dateVal = parseISO(value);
    const is10YearsAgo = args.constraints.includes('10YearsAgo');
    if (!RE_ISO_DATE.test(`${value}`) || !isValid(dateVal)) {
      return false;
    }
    if (is10YearsAgo) {
      const fechaActual = new Date();
      const fechaHace10Anos = subYears(fechaActual, 10);
      if (isBefore(dateVal, fechaHace10Anos)) {
        return false;
      }
    }
    const isValueMayorThanReference = isAfter(new Date(), dateVal);
    return isValueMayorThanReference;
  }

  defaultMessage(args: ValidationArguments) {
    const value = (args as any).value;
    const dateVal = parseISO(value);
    const is10YearsAgo = args.constraints.includes('10YearsAgo');
    if (!RE_ISO_DATE.test(value) || !isValid(dateVal)) {
      return `validation.IS_DATE|${JSON.stringify(args)}`;
    }
    if (is10YearsAgo) {
      const fechaActual = new Date();
      const fechaHace10Anos = subYears(fechaActual, 10);
      if (isBefore(dateVal, fechaHace10Anos)) {
        return 'validation.DATE_MIN_MAX_10YEARS_FROM_TODAY';
      }
    }
    return `validation.DATE_MAX_TODAY|${JSON.stringify(args)}`;
  }

  async validateForUpdate(value: any) {
    formatDateToIsoString(value);
  }
}
