/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Type } from '@nestjs/common';
import { getUseCaseToken } from '../tokens-cache';

/**
 * Decorator that enables dependency injection of Use Case proxies into controllers or services.
 * Automatically resolves the correct injection token for a Use Case class.
 *
 * @remarks
 * This decorator:
 * - Generates or retrieves the injection token for the specified Use Case
 * - Works with NestJS's dependency injection system
 * - Returns a properly configured `@Inject()` decorator
 *
 * @example
 * ```typescript
 * // Injecting into a controller
 * @Controller()
 * export class UserController {
 *   constructor(
 *     @InjectUseCase(CreateUserUseCases)
 *     private readonly createUserUC: UseCaseProxy<CreateUserUseCases>
 *   ) {}
 * }
 *
 * // Injecting into a service
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectUseCase(UpdateUserUseCases)
 *     private readonly updateUserUC: UseCaseProxy<UpdateUserUseCases>
 *   ) {}
 * }
 * ```
 *
 * @param useCase - The Use Case class to be injected (must be decorated with `@InjectableUseCase()`)
 * @returns A parameter decorator that marks the property for dependency injection
 *
 * @throws Error if the Use Case is not properly registered in the DI container
 *
 * @publicApi
 */

export function InjectUseCase(useCase: Type<any>) {
  const token = getUseCaseToken(useCase);
  return Inject(token);
}
