/* eslint-disable @typescript-eslint/no-explicit-any */
import { Type } from '@nestjs/common';
import { USE_CASE_TOKENS } from './constants';

export function getUseCaseToken(useCase: Type<any>): string | symbol {
  if (USE_CASE_TOKENS.has(useCase)) {
    return USE_CASE_TOKENS.get(useCase);
  }
  const token =
    process.env.NODE_ENV === 'production'
      ? Symbol.for(`UC_${useCase.name}`) // more secure
      : `UC_${useCase.name}`; // only for dev
  USE_CASE_TOKENS.set(useCase, token);
  return token;
}
