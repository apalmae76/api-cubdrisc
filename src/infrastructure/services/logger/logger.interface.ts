export interface IApiLogger {
  error(message: string, data?: object, justOneLevel?: boolean): void;
  warn(message: string, data?: object, justOneLevel?: boolean): void;
  info(message: string, data?: object, justOneLevel?: boolean): void;
  debug(message: string, data?: object, justOneLevel?: boolean): void;
  verbose(message: string, data?: object, justOneLevel?: boolean): void;
}
