/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject } from '@nestjs/common';
import { IApiLogger } from '../logger/logger.interface';
import { API_LOGGER_KEY } from '../logger/logger.module';

interface LogData {
  msg: string;
  meta: any;
}
export class MailSeqLoggerAdapter {
  constructor(@Inject(API_LOGGER_KEY) private readonly logger: IApiLogger) { }

  log(meta: any) {
    const logData = this.getMessage(meta);
    this.logger.verbose(logData.msg, logData.meta);
  }

  debug(meta: any) {
    const logData = this.getMessage(meta);
    this.logger.debug(logData.msg, logData.meta);
  }

  info(meta: any) {
    const logData = this.getMessage(meta);
    this.logger.info(logData.msg, logData.meta);
  }

  warn(meta: any) {
    const logData = this.getMessage(meta);
    this.logger.warn(logData.msg, logData.meta);
  }

  error(meta: any) {
    const logData = this.getMessage(meta);
    this.logger.error(logData.msg, logData.meta);
  }

  private getMessage(meta: any): LogData {
    let msg = `Mailier component: ${meta.component}, tnx: ${meta.tnx}`;
    if (meta.username) {
      msg += `, username: ${meta.username}`;
    }
    if (meta.action) {
      msg += `, action: ${meta.action}`;
    }
    if (meta.version) {
      msg += `, version: ${meta.version}`;
    }
    const message = meta?.err?.response ?? null;
    if (message) {
      meta = {
        ...meta,
        message,
      };
    }
    return {
      msg,
      meta,
    };
  }
}
