/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  ArgumentsHost,
  BadGatewayException,
  BadRequestException,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  NotImplementedException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { I18nContext, I18nService, Path, TranslateOptions } from 'nestjs-i18n';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { extractCurrentUserFromRequestWithAccessToken } from '../decorators/current-user.decorator';
import { ResponseFormat } from '../interceptors/response.interceptor';
import { extractErrorDetails } from '../utils/extract-error-details';
import { getIP } from '../utils/get-ip';
interface IError {
  message: string;
}

@Catch(
  BadRequestException, // -------- 400
  UnauthorizedException, // ------ 401
  ForbiddenException, // --------- 403
  NotFoundException, // ---------- 404
  UnprocessableEntityException, // 422.
  InternalServerErrorException, // 500
  NotImplementedException, // ---- 501.
  BadGatewayException, // -------- 502.
  ServiceUnavailableException, //  503.
  GatewayTimeoutException, // ---- 504.
)
export class MyExceptionFilter implements ExceptionFilter {
  private errorsDetails: object | string | null = null;
  private technicalError: string | null = null;
  private isNotProductionEnv: boolean;
  constructor(
    private readonly logger: ApiLoggerService,
    isNotProductionEnv: boolean,
    @Inject(I18nService) private readonly i18nService: I18nService,
  ) {
    this.isNotProductionEnv = isNotProductionEnv;
  }
  async catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request: any = ctx.getRequest();

    const status =
      exception instanceof HttpException &&
        typeof exception.getStatus === 'function'
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as IError)
        : { message: (exception as Error).message };
    const i18nCurrent = I18nContext.current();
    const i18n = i18nCurrent?.service ?? this.i18nService;

    //* console.log('////////////message///////////////');
    //* console.log(message);
    //* console.log('////exception no personalizada////');
    //* console.log(exception);
    //* console.log('////////////--- ----///////////////');

    let errorMsg = 'Bad request';
    let transfMessages: string[] = [];
    const lang =
      i18nCurrent?.lang ??
      request.headers['accept-language']?.split(',')[0] ??
      'es';
    try {
      if (
        message['statusCode'] === 400 &&
        (message['message'].includes('in JSON') ||
          message['message'].includes('Multipart') ||
          message['message'].includes('Unexpected') ||
          message['message'].includes('Failed to decode'))
      ) {
        this.technicalError = message['message'] ?? '';
        transfMessages.push(`${errorMsg}; check !`);
      } else if (exception instanceof NotFoundException) {
        errorMsg = 'Not found resource';
        transfMessages = this.formatI18nErrors(message.message, i18n, { lang });
      } else if (exception instanceof BadGatewayException) {
        errorMsg = 'Missing server configuration';
        transfMessages = this.formatI18nErrors(message.message, i18n, { lang });
      } else if (exception instanceof UnprocessableEntityException) {
        errorMsg = 'Unprocessable request';
        transfMessages = this.formatI18nErrors(message.message, i18n, { lang });
      } else if (exception instanceof ServiceUnavailableException) {
        errorMsg = 'Service not available now';
        transfMessages = this.formatI18nErrors(message.message, i18n, { lang });
      } else if (exception instanceof GatewayTimeoutException) {
        errorMsg = 'Gateway timeout';
        transfMessages = this.formatI18nErrors(message.message, i18n, { lang });
      } else if (exception instanceof UnauthorizedException) {
        // 401
        errorMsg = 'User not loged';
        if (message.message === 'Unauthorized') {
          const message = i18n.translate('messages.common.USER_NOT_LOGGED');
          transfMessages.push(message);
        } else {
          transfMessages = this.formatI18nErrors(message.message, i18n, {
            lang,
          });
        }
      } else if (exception instanceof ForbiddenException) {
        // 403
        errorMsg = 'Do not have access to the requested resource';
        if (message.message === 'Forbidden resource') {
          const message = i18n.translate('messages.common.USER_FORBIDEN');
          transfMessages.push(message);
        } else {
          transfMessages = this.formatI18nErrors(message.message, i18n, {
            lang,
          });
        }
      } else if (message.message) {
        transfMessages = this.formatI18nErrors(message.message, i18n, { lang });
      } else {
        transfMessages.push('Something went wrong, verify');
      }
      exception.message = this.technicalError ?? transfMessages[0] ?? errorMsg;
    } catch (er: unknown) {
      const message = extractErrorDetails(er);
      this.logger.error('MyExceptionFilter, message={message}', {
        message,
        context: `${MyExceptionFilter.name}.catch`,
      });
    }
    // const errorMsg = i18n.translate('messages.common.BAD_REQUEST');
    const responseData: ResponseFormat<object> = {
      data: {},
      message: errorMsg,
      statusCode: status,
      errors: transfMessages,
    };

    if (this.errorsDetails) {
      responseData.errorsDetails = this.errorsDetails;
      this.errorsDetails = null;
    }
    if (this.technicalError) {
      responseData.technicalError = this.technicalError;
      this.technicalError = null;
    }

    await this.logMessage(request, message, status, exception, responseData);
    if (this.isNotProductionEnv === false) {
      delete responseData.technicalError;
    }
    response.status(status).json(responseData);
  }

  private async logMessage(
    request: any,
    message: IError,
    status: number,
    exception: any,
    response: any,
  ) {
    let shortMsg = message.message ? message.message : null;
    if (shortMsg && shortMsg[0].includes('|')) {
      const [small] = shortMsg[0].split('|');
      shortMsg = small;
    }
    const ip = getIP(request.headers, request.connection.remoteAddress);
    const outputMsg = `End request for {path}, status={status} message={message} ==========`;
    const { path, baseUrl, method, body, query, params } = request;
    const technicalError = response?.technicalError ?? undefined;
    if (this.isNotProductionEnv === false) {
      delete response.technicalError;
    }
    const logData = {
      path: path === '/' ? baseUrl : path,
      method,
      ip,
      body,
      query,
      params,
      userId: Number(request.user?.id ?? -1),
      deviceKey: request.user?.deviceKey ?? '?',
      appType: request.headers['app'] ?? '?',
      frontVersion: request.headers['version'] ?? '?',
      userAgent: request.headers['user-agent'] ?? 'NULL',
      status,
      correlationId: request.headers['correlation-id'],
      message: shortMsg,
      stack: exception.stack,
      localContext: `${MyExceptionFilter.name}.logMessage`,
      context: `${method}`,
      technicalError,
      response,
      exception,
    };
    if (logData.userId === -1) {
      const user = await extractCurrentUserFromRequestWithAccessToken(
        null,
        request,
      );
      if (user) {
        logData.userId = user.id;
        logData.appType = user.app;
        logData.deviceKey = user.deviceKey;
      }
    }
    if (status >= 500 && status < 600) {
      this.logger.error(outputMsg, logData);
    } else if (status === 400 || status === 404) {
      this.logger.verbose(outputMsg, logData);
    } else {
      this.logger.warn(outputMsg, logData);
    }
  }

  private formatI18nErrors<K = Record<string, unknown>>(
    errors: string,
    i18n: I18nService<K>,
    options?: TranslateOptions,
  ): string[] {
    const errorsMsgs: string[] = [];
    const isBadRoute = errors.includes('Cannot ');
    if (isBadRoute) {
      const route = errors.slice(12);
      const args = {
        route,
        technicalError: `Route not found, not defined or used incorrectly (${route}), please check`,
      };
      const key = `messages.common.BAD_ROUTE|${JSON.stringify(args)}`;
      errorsMsgs.push(
        this.transformError<K>(
          key,
          i18n,
          options,
          'Not found resource, please check',
        ),
      );
      return errorsMsgs;
    }
    if (Array.isArray(errors)) {
      for (const error of errors) {
        errorsMsgs.push(this.transformError<K>(error, i18n, options));
      }
    } else {
      errorsMsgs.push(this.transformError<K>(errors, i18n, options));
    }
    return errorsMsgs;
  }

  private transformError<K = Record<string, unknown>>(
    error: string,
    i18n: I18nService<K>,
    options?: TranslateOptions,
    defaultValue?: string,
  ): any {
    try {
      const [key, argsString] = error.split('|');
      const args = argsString ? JSON.parse(argsString) : {};
      if (args.errorsDetails && args.errorsDetails.code) {
        this.errorsDetails = args.errorsDetails;
        if (
          args.errorsDetails.code === 'HELP' &&
          args.errorsDetails.description
        ) {
          args.errorsDetails.description = args.errorsDetails.transl
            ? i18n.translate(
              `help.${args.errorsDetails.description}` as Path<K>,
              { ...options, args, defaultValue },
            )
            : args.errorsDetails.description;
          delete args.errorsDetails.transl;
        }
      }
      if (args.technicalError) {
        this.technicalError = args.technicalError;
      }
      if (key !== 'EMPTY') {
        const errs = i18n.translate(key as Path<K>, {
          ...options,
          args,
          defaultValue,
        });
        return errs;
      }
    } catch (er) {
      this.logger.warn(
        'ERROR when try to format error output response, check',
        {
          message: 'ERROR when try to format error output response, check',
          error: er.message ?? 'No message defined',
          context: `${MyExceptionFilter.name}.transformError.catch`,
        },
      );
      this.technicalError = error;
      return error;
    }
  }
}
