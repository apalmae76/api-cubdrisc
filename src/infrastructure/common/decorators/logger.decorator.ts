/* eslint-disable @typescript-eslint/no-unused-vars */
// target: The class containing the method
// propertyKey: The method name (string)
// descriptor: The property descriptor of the method
import { UseCaseBase } from 'src/usecases/usecases.base';
/**
 * Transforms function arguments for safe logging, handling:
 * - Large objects (truncates)
 * - Circular references
 * - Binary data/Buffers
 * - Special objects (Date, Error, etc.)
 * - Prevents logger crashes from oversized data
 */
function transformFunctionArgsForLogging(args: unknown[]): unknown[] {
  const argumentSizeLimit = 1024;
  return args.map((arg) => {
    if (arg === null || arg === undefined) {
      return arg;
    }
    if (
      typeof arg === 'string' ||
      typeof arg === 'number' ||
      typeof arg === 'boolean'
    ) {
      return arg;
    }
    if (arg instanceof Date) {
      return arg.toISOString();
    }
    if (arg instanceof Error) {
      return {
        message: arg.message,
        stack: arg.stack,
      };
    }
    if (arg instanceof Buffer) {
      return `<Buffer size=${arg.length}>`;
    }

    // Safely stringify complex objects
    try {
      const seen = new WeakSet();
      const replacer = (_: string, value: unknown) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      };

      const jsonString = JSON.stringify(arg, replacer);
      if (jsonString.length > argumentSizeLimit) {
        return {
          _truncated: true,
          type: typeof arg,
          preview: jsonString.substring(0, 500) + '...',
          originalSize: jsonString.length,
        };
      }
      return JSON.parse(jsonString);
    } catch (e) {
      return {
        _unserializable: true,
        type: Object.prototype.toString.call(arg),
        stringValue: String(arg),
      };
    }
  });
}
/**
 * @description A class method decorator that automatically adds consistent logging and error handling
 * to async methods in classes extending UseCaseBase. Avoids repetitive try-catch and logging boilerplate.
 *
 * @template T - Must extend from UseCaseBase (requires `logger` and `personalizeError` members)
 *
 * @example
 * ```typescript
 * class MyUseCase extends UseCaseBase {
 *   @AsyncBaseUseCaseLogger()
 *   async execute(params: SomeDto): Promise<Result> {
 *     // Business logic only - no need for manual try-catch or logging
 *     return this.repository.process(params);
 *   }
 * }
 * ```
 *
 * @remarks
 * Automatically provides:
 * - Start/end logging with timestamps
 * - Execution duration measurement
 * - Consistent error handling
 * - Contextual logging (class.method format)
 *
 * @returns A decorated method with automatic logging and error handling
 *
 * @throws Re-throws any caught errors after logging and processing
 *
 */
export function UseCaseLogger<T extends UseCaseBase>() {
  return function (
    target: T,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const className = String(target.constructor.name);
    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);
    const context = `${className}.${methodName}`;
    descriptor.value = async function (this: T, ...args: unknown[]) {
      const startTime = Date.now();
      const { logger } = this;

      logger.debug(`Starting`, {
        context,
        arguments: transformFunctionArgsForLogging(args),
      });
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        logger.debug(`Ended, duration: ${duration}ms`, {
          context,
          duration,
        });
        return result;
      } catch (er: unknown) {
        await this.personalizeError(er, context);
      }
    };
    return descriptor;
  };
}
