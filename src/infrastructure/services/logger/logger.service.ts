/* eslint-disable @typescript-eslint/no-unused-vars */
import { SeqLogger } from '@jasonsoft/nestjs-seq';
import { Inject, Injectable } from '@nestjs/common';
import { extractErrorDetails } from 'src/infrastructure/common/utils/extract-error-details';
import { v4 as uuidv4 } from 'uuid';
import { EnvironmentConfigService } from '../../config/environment-config/environment-config.service';
import ContextStorageService, {
  ContextStorageServiceKey,
} from '../context/context.interface';

@Injectable()
export class ApiLoggerService {
  private contextTitle = '';
  private context = 'ApiLoggerService.';
  private logLevel = '';
  constructor(
    private readonly appConfig: EnvironmentConfigService,
    private readonly logger: SeqLogger,
    @Inject(ContextStorageServiceKey)
    private contextStorageService: ContextStorageService,
  ) {
    this.logLevel = this.appConfig.getLogLevel();
  }

  error(message: string, data?: object, justOneLevel: boolean = false) {
    const newData = this.getAddData(data, justOneLevel);
    try {
      this.logger.error(message, newData);
    } catch (er) {
      this.logToConsole('ERROR log', message, newData, er.message);
    }
  }

  warn(message: string, data?: object, justOneLevel: boolean = false) {
    const newData = this.getAddData(data, justOneLevel);
    try {
      this.logger.warn(message, newData);
    } catch (er) {
      this.logToConsole('WARN log', message, newData, er.message);
    }
  }

  info(message: string, data?: object, justOneLevel: boolean = false) {
    const newData = this.getAddData(data, justOneLevel);
    try {
      this.logger.info(message, newData);
    } catch (er) {
      this.logToConsole('INFO log', message, newData, er.message);
    }
  }

  debug(message: string, data?: object, justOneLevel: boolean = false) {
    if (this.logLevel === 'debug' || this.logLevel === 'trace') {
      const newData = this.getAddData(data, justOneLevel);
      try {
        this.logger.debug(message, newData);
      } catch (er) {
        this.logToConsole('DEBUG log', message, newData, er.message);
      }
    }
  }

  verbose(message: string, data?: object, justOneLevel: boolean = false) {
    const newData = this.getAddData(data, justOneLevel);
    try {
      this.logger.verbose(message, newData);
    } catch (er) {
      this.logToConsole('VERBOSE log', message, newData, er.message);
    }
  }

  private getAddData(data?: object, justOneLevel: boolean = false): object {
    try {
      if (data) {
        if (data['correlationId']) {
          this.contextStorageService.setContextId(data['correlationId']);
        }
        if (data['ip']) {
          this.contextStorageService.set<string>('ip', data['ip']);
        }
        if (data['serviceName']) {
          this.contextStorageService.set<string>(
            'serviceName',
            data['serviceName'],
          );
        }
        if (data['userId']) {
          this.contextStorageService.set<number>(
            'userId',
            Number(data['userId']),
          );
        }
        if (data['appType']) {
          this.contextStorageService.set<string>('appType', data['appType']);
        }
      }
      const serviceName =
        this.contextStorageService.get<string>('serviceName') || null;
      const ip = this.contextStorageService.get<string>('ip') || '?';
      const appType =
        this.contextStorageService.get<string>('appType') ||
        this.contextStorageService.get<string>('app') ||
        'NOT DEFINED';
      const userId = this.contextStorageService.get<number>('userId') || null;
      let correlationId = this.contextStorageService.getContextId() || null;
      if (!correlationId) {
        try {
          correlationId = uuidv4();
          this.contextStorageService.setContextId(correlationId);
        } catch (er) {
          correlationId = uuidv4();
        }
      }

      const cleanData = this.cleanProtectedData(data, justOneLevel);

      return {
        appName: this.appConfig.getAppName(),
        appVersion: this.appConfig.getAppVersion(),
        appEnvironment: this.appConfig.getNodeEnv(),
        userId,
        appType,
        ip,
        correlationId,
        serviceName,
        ...cleanData,
      };
    } catch (er: unknown) {
      const { message } = extractErrorDetails(er);
      this.logger.error(
        `${this.contextTitle}Adding base data: Ends with error; {message}`,
        {
          context: `${this.context}getAddData`,
          appName: this.appConfig.getAppName(),
          appVersion: this.appConfig.getAppVersion(),
          appEnvironment: this.appConfig.getNodeEnv(),
          message,
          marker: 'SEQ-LOGGER-ERROR',
        },
      );
      return {
        appName: this.appConfig.getAppName(),
        appVersion: this.appConfig.getAppVersion(),
        appEnvironment: this.appConfig.getNodeEnv(),
      };
    }
  }

  private cleanProtectedData(
    data: object,
    justOneLevel: boolean = false,
    childs: number = 0,
    retry = false,
  ): object {
    try {
      const isNotProdOrStaging = !(
        this.appConfig.isProductionEnv() || this.appConfig.isStagingEnv()
      );
      if (childs > 10 || isNotProdOrStaging) {
        return data;
      }
      const cleanData = { ...data };
      let found = 0;
      for (const key in cleanData) {
        if (
          key === 'cvv' ||
          key === 'cardNumber' ||
          key === 'accessToken' ||
          key === 'refreshToken'
        ) {
          if (key === 'cvv' && cleanData[key]) {
            cleanData[key] = '###';
            found++;
          } else if (key === 'accessToken' && cleanData[key]) {
            cleanData[key] = 'xxTOKENxx';
            found++;
          } else if (key === 'refreshToken' && cleanData[key]) {
            cleanData[key] = 'xxREF-TOKENxx';
            found++;
          } else if (key === 'cardNumber' && cleanData[key]) {
            const cardNumber = cleanData[key].replace(/[\s-]/g, '');
            cleanData[key] = `${cardNumber.slice(0, 6)}####${cardNumber.slice(
              -4,
            )}`;
            found++;
          }
          if (found === 4) {
            return cleanData;
          }
        }
        if (justOneLevel === false && typeof cleanData[key] === 'object') {
          childs++;
          cleanData[key] = this.cleanProtectedData(
            cleanData[key],
            justOneLevel,
            childs,
          );
        }
      }
      return cleanData;
    } catch (er: unknown) {
      const { message } = extractErrorDetails(er);
      this.logger.error(
        `${this.contextTitle}Clean protected data: Ends with error; {message}`,
        {
          context: `${this.context}cleanProtectedData`,
          appName: this.appConfig.getAppName(),
          appVersion: this.appConfig.getAppVersion(),
          appEnvironment: this.appConfig.getNodeEnv(),
          message,
          marker: 'SEQ-LOGGER-ERROR',
        },
      );
      this.logToConsole('Clean protected data', null, data, message);
      if (retry) {
        return null;
      } else {
        return this.cleanProtectedData(data, true, 0, true);
      }
    }
  }

  private logToConsole(
    logType: string,
    message: string,
    data: object,
    erMessge: string,
  ) {
    console.log(`${this.contextTitle}${logType}: Ends with error....`);
    console.log(`Error description (catch): ${erMessge}`);
    if (message) {
      console.log(`Log message was: ${message}`);
    }
    if (data) {
      console.log(`Data:`);
      console.log(data);
    }
  }
}
