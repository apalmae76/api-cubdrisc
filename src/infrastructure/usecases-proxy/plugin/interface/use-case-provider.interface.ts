/* eslint-disable @typescript-eslint/no-explicit-any */
import { InjectionToken } from '@nestjs/common';
import { UseCaseProxy } from '../../usecases-proxy';

/**
 * Interface for the dynamic provider metadata stored by @InjectableUseCase
 * @internal
 */

export interface IUseCaseProviderData {
  token: InjectionToken;
  factory: <T>(...args: any[]) => UseCaseProxy<T>;
  dependencies: any[];
}
