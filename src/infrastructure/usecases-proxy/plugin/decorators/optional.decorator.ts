import { optionalParamReflectorKey } from '../constants';

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Decorator that marks a Use Case constructor parameter as optional for dependency injection.
 * When applied, NestJS's DI system will not throw an error if the dependency is not found.
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
export function Optional() {
  return (target: any, _: string | symbol, index: number) => {
    const existing =
      Reflect.getMetadata(optionalParamReflectorKey, target) || [];
    Reflect.defineMetadata(
      optionalParamReflectorKey,
      [...existing, index],
      target,
    );
  };
}
