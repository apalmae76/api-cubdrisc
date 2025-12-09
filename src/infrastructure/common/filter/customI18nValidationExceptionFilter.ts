import { ArgumentsHost, Catch, HttpStatus, Inject } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import {
  I18nContext,
  I18nValidationException,
  I18nValidationExceptionFilter,
} from 'nestjs-i18n';
import { IApiLogger } from 'src/infrastructure/services/logger/logger.interface';
import { API_LOGGER_KEY } from 'src/infrastructure/services/logger/logger.module';
import { getIP } from '../utils/get-ip';

@Catch(I18nValidationException)
export class CustomI18nValidationExceptionFilter extends I18nValidationExceptionFilter {
  constructor(@Inject(API_LOGGER_KEY) private readonly logger: IApiLogger) {
    super({
      errorFormatter: (errors: ValidationError[]) => {
        const errorMessages = this.getErrorMessages(
          errors,
          I18nContext.current(),
        );
        return errorMessages;
      },
    });
  }

  catch(
    exception: I18nValidationException,
    host: ArgumentsHost,
  ): I18nValidationException {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();
    const now = Date.now();
    const ip = getIP(request.headers, request.connection.remoteAddress);
    const { path, method, body, query, params } = request;
    const appType = request.headers.app || null;
    const status = HttpStatus.BAD_REQUEST;

    const errorMessages = this.getErrorMessages(
      exception.errors,
      I18nContext.current(),
    );
    const duration = Date.now() - now;
    this.logger.info(
      `End request, failed for ${path}, status ${status}, duration=${duration}ms ============`,
      {
        path,
        method,
        body,
        query,
        params,
        ip,
        userId: Number(request.user?.id || -1),
        appType,
        correlationId: request.headers['correlation-id'],
        error: errorMessages,
        status,
        duration,
        context: `${method}`,
      },
    );

    response.status(status).json({
      data: {},
      message: 'Bad request (V)',
      statusCode: status,
      errors: errorMessages,
    });

    return exception;
  }

  getErrorMessages(errors: ValidationError[], i18n: I18nContext): string[] {
    const errorsMsgs = [];
    //* console.log(`----  errors  ----`);
    //* console.log(errors);
    //* console.log(`----/ errors /----`);
    for (const error of errors) {
      if (Object.values(error.constraints).length > 0) {
        const propertyName = i18n.translate(
          `validation.properties.${error.property}`,
        );
        const errs = Object.values(error.constraints).map((message) => {
          try {
            const [key, argsString] = message.split('|');
            const args = argsString ? JSON.parse(argsString) : {};
            const traslMsg = i18n.translate(key, { args });
            return `${propertyName}: ${traslMsg}`;
          } catch {
            return `${propertyName}: ${message}`;
          }
        });
        errorsMsgs.push(...errs);
      }
      if (error.children && error.children.length > 0) {
        //* console.log(`----  error.children ----`);
        //* console.log(error.children);
        //* console.log(`----/ error.children /----`);
        const errs = this.getErrorMessages(error.children, i18n);
        errorsMsgs.push(...errs);
      }
    }
    return errorsMsgs;
  }
}
