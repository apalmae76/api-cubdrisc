/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiLoggerService } from '../logger/logger.service';

interface LogData {
  msg: string;
  meta: any;
}
export class MailSeqLoggerAdapter {
  constructor(private readonly logger: ApiLoggerService) {}

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
    let msg = 'Mailier component: {component}, tnx: {tnx}';
    if (meta.username) {
      msg += `, username: {username}`;
    }
    if (meta.action) {
      msg += `, action: {action}`;
    }
    if (meta.version) {
      msg += `, version: {version}`;
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
