/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject } from '@nestjs/common';
import { IApiLogger } from 'src/infrastructure/services/logger/logger.interface';
import { API_LOGGER_KEY } from 'src/infrastructure/services/logger/logger.module';
import { Logger } from 'typeorm';

export class TypeOrmSeqLoggerAdapter implements Logger {
  constructor(@Inject(API_LOGGER_KEY) private readonly logger: IApiLogger) { }

  logQuery(query: string, parameters?: any[]) {
    let queryType = query.slice(0, 6);
    if (queryType === 'START ') {
      queryType =
        '-------------------- START TRANSACTION ------------------------------------------';
    } else if (queryType === 'ROLLBA') {
      queryType =
        '-------------------- ROLLBACK TRANSACTION -------------------------------------';
    } else if (queryType === 'COMMIT') {
      queryType =
        '-------------------- COMMIT TRANSACTION --------------------------------------';
    }
    this.logger.debug(`[QUERY] ${queryType}`, {
      queryType,
      query,
      parameters,
    });
  }

  logQueryError(error: string, query: string, parameters?: any[]) {
    const queryType = query.slice(0, 6);
    this.logger.error('{message}', {
      queryType,
      query,
      message: `[QUERY] ${queryType} Error: ${error}`,
      parameters,
    });
  }

  logQuerySlow(time: number, query: string, parameters?: any[]) {
    const queryType = query.slice(0, 6);
    this.logger.warn(`{message}`, {
      queryType,
      query,
      message: `[QUERY] ${queryType} Slow: ${time}ms`,
      parameters,
    });
  }

  logSchemaBuild(message: string) {
    this.logger.debug(`[SCHEMA BUILD] ${message}`);
  }

  logMigration(message: string) {
    this.logger.debug(`[MIGRATION] ${message}`);
  }

  log(level: 'log' | 'info' | 'warn', message: any) {
    switch (level) {
      case 'log':
        this.logger.verbose(message, { message });
        break;
      case 'info':
        this.logger.info(message, { message });
        break;
      case 'warn':
        this.logger.warn(message, { message });
        break;
    }
  }
}
