import { injectTokenReflectorKEy } from '../constants';

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Decorator that injects a Use Case constructor parameter using a inyection token.
 *
 * @remarks
 * - Must be applied to constructor parameters only
 * - Works in conjunction with `@InjectableUseCase()`
 * - Stores metadata used by the DI system to skip unresolved dependencies
 *
 * @example
 * ```typescript
 * @InjectableUseCase()
 * export class PaymentUseCases {
 *   constructor(
 *     private readonly paymentRepo: PaymentRepository,
 *     @Optional() private readonly logger?: LoggerService // Won't fail if LoggerService isn't registered
 *   ) {}
 * }
 * ```
 *
 * @returns A parameter decorator that marks the dependency as optional
 *
 * @publicApi
 */
export function InjectWithToken<T>(token: string | symbol) {
  return (target: T, _: any, paramIndex: number) => {
    const existingToken =
      Reflect.getMetadata(injectTokenReflectorKEy, target) || {};
    existingToken[paramIndex] = token;
    Reflect.defineMetadata(injectTokenReflectorKEy, existingToken, target);
  };
}
