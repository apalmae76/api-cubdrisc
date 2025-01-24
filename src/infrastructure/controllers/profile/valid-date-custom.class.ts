/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isValid, parseISO } from 'date-fns';
import { RE_ISO_DATE } from 'src/infrastructure/common/utils/constants';
import { formatDateToIsoString } from 'src/infrastructure/common/utils/format-date';

@ValidatorConstraint({ name: 'validDate', async: false })
export class ValidDate implements ValidatorConstraintInterface {
  validate(date: string) {
    if (!date) {
      return true;
    }
    const dateVal = parseISO(date);
    return RE_ISO_DATE.test(`${date}`) && isValid(dateVal);
  }

  defaultMessage(args: ValidationArguments) {
    return `validation.IS_DATE|{"value":"${args.value}"}`;
  }

  async validateForUpdate(value: any) {
    formatDateToIsoString(value);
  }
}
