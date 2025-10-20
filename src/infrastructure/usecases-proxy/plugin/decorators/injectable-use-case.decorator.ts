/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, InjectionToken, Type } from '@nestjs/common';
import { UseCaseProxy } from '../../usecases-proxy';

import {
  dynamicProviderReflectorKey,
  injectTokenReflectorKEy,
  optionalParamReflectorKey,
} from '../constants';
import { IUseCaseProviderData } from '../interface/use-case-provider.interface';
import { getUseCaseToken } from '../tokens-cache';
import { registerProvider } from '../use-case.utils';

/**
 * Decorator that automatically registers a Use Case class in the DI container
 * and wraps it in a UseCaseProxy for consistent access patterns.
 *
 * @remarks
 * This decorator handles:
 * - Automatic provider registration
 * - Optional parameter detection
 * - Proxy wrapping
 * - Dependency token management
 *
 * @example
 * @InjectableUseCase()
 * export class CreateUserUseCases {
 *   constructor(
 *     private readonly repository: UserRepository,
 *     @Optional() private readonly logger?: Logger
 *   ) {}
 * }
 * ```
 *
 * @template T - The Use Case class type being decorated
 * @returns A class decorator function that prepares the Use Case for DI
 *
 * @publicApi
 */

export function InjectableUseCase() {
  return <T extends Type<any>>(useCase: T) => {
    Injectable()(useCase);
    const paramsTypes: Array<any> =
      Reflect.getMetadata('design:paramtypes', useCase) || [];
    const optionalParams: number[] =
      Reflect.getMetadata(optionalParamReflectorKey, useCase) || [];
    const injections = paramsTypes
      .map((type, index) => {
        if (optionalParams.includes(index)) {
          // skip undefined params for DI
          return undefined;
        }
        // manage custom injection tokens
        const injectionsTokens =
          Reflect.getMetadata(injectTokenReflectorKEy, useCase) || {};
        return injectionsTokens[index] || type;
      })
      // filter undefined injections
      .filter((x): x is InjectionToken => x !== undefined);

    const injectionTokenToUse = getUseCaseToken(useCase);

    const meta: IUseCaseProviderData = {
      token: injectionTokenToUse,
      factory: (...args: any[]) => {
        // skip optional params from DI
        const fullArgs = paramsTypes.map((_, index) =>
          optionalParams.includes(index) ? undefined : args.shift(),
        );
        const useCaseInstance = new useCase(...fullArgs);
        const proxy = new UseCaseProxy(useCaseInstance);
        return proxy;
      },
      dependencies: injections,
    };
    // save metada for service
    Reflect.defineMetadata(dynamicProviderReflectorKey, meta, useCase);
    registerProvider(useCase, injectionTokenToUse);

    return useCase;
  };
}
