import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConsoleLoggerModule } from './console/console-logger.module';
import { ConsoleLoggerService } from './console/console-logger.service';
import { MySeqLoggerModule } from './seq/seq-logger.module';
import { MySeqLoggerService } from './seq/seq-logger.service';
import { LoggerTypes } from './types';

export const API_LOGGER_KEY = Symbol('API_LOGGER_KEY');

@Global()
@Module({})
export class ApiLoggerModule {
  static register(): DynamicModule {
    const loggerType = process.env.LOGGER_TYPE as LoggerTypes;
    if (!loggerType) {
      throw new Error(
        `Invalid logger type register on ApiLoggerModule: '${process.env.LOGGER_TYPE}'`,
      );
    }
    return {
      module: ApiLoggerModule,
      imports:
        loggerType === 'CONSOLE' ? [ConsoleLoggerModule] : [MySeqLoggerModule],
      providers: [
        {
          provide: API_LOGGER_KEY,
          useExisting:
            loggerType === 'CONSOLE'
              ? ConsoleLoggerService
              : MySeqLoggerService,
        },
      ],
      exports: [API_LOGGER_KEY],
    };
  }
}
