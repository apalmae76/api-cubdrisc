/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
  InternalServerErrorException,
  NotFoundException,
  NotImplementedException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { I18nContext, I18nService, Path, TranslateOptions } from 'nestjs-i18n';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
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
  private errorsDetails = null;
  private technicalError = null;
  private isNotProductionEnv: boolean;
  constructor(
    private readonly logger: ApiLoggerService,
    isNotProductionEnv: boolean,
  ) {
    this.isNotProductionEnv = isNotProductionEnv;
  }
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request: any = ctx.getRequest();

    //* console.log('//// exception no personalizada ////');
    //* console.log(exception);

    const status =
      exception instanceof HttpException &&
      typeof exception.getStatus === 'function'
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as IError)
        : { message: (exception as Error).message };
    const i18n = I18nContext.current();

    //* console.log('////////////message///////////////');
    //* console.log(message);
    //* console.log('////exception no personalizada////');
    //* console.log(exception);
    //* console.log('////////////-------///////////////');

    let errorMsg = 'Bad request';
    let transfMessages = [];
    try {
      if (message['statusCode'] === 400) {
        if (message['message'].includes('in JSON')) {
          transfMessages.push(message['message']);
        } else if (message['message'].includes('Multipart')) {
          transfMessages.push(message['message']);
        } else if (message['message'].includes('Unexpected')) {
          transfMessages.push(message['message']);
        }
      }
      if (exception instanceof NotFoundException) {
        errorMsg = 'Not found resource';
        transfMessages = this.formatI18nErrors(message.message, i18n.service, {
          lang: i18n.lang,
        });
      } else if (exception instanceof BadGatewayException) {
        errorMsg = 'Missing server configuration';
        transfMessages = this.formatI18nErrors(message.message, i18n.service, {
          lang: i18n.lang,
        });
      } else if (exception instanceof UnprocessableEntityException) {
        errorMsg = 'Unprocessable request';
        transfMessages = this.formatI18nErrors(message.message, i18n.service, {
          lang: i18n.lang,
        });
      } else if (exception instanceof ServiceUnavailableException) {
        errorMsg = 'Service not available now';
        transfMessages = this.formatI18nErrors(message.message, i18n.service, {
          lang: i18n.lang,
        });
      } else if (exception instanceof GatewayTimeoutException) {
        errorMsg = 'Gateway timeout';
        transfMessages = this.formatI18nErrors(message.message, i18n.service, {
          lang: i18n.lang,
        });
      } else if (
        exception instanceof UnauthorizedException &&
        message.message === 'Unauthorized'
      ) {
        errorMsg = 'Unauthorized';
        transfMessages.push(i18n.translate('messages.common.USER_NOT_LOGGED'));
      } else if (exception instanceof ForbiddenException) {
        errorMsg = 'Forbidden resource';
        if (message.message === 'Forbidden resource') {
          transfMessages.push(i18n.translate('messages.common.USER_FORBIDEN'));
        } else {
          transfMessages = this.formatI18nErrors(
            message.message,
            i18n.service,
            {
              lang: i18n.lang,
            },
          );
        }
      } else if (message.message) {
        transfMessages = this.formatI18nErrors(message.message, i18n.service, {
          lang: i18n.lang,
        });
      } else {
        transfMessages.push('Something went wrong, verify');
      }
    } catch (er: unknown) {
      const message = extractErrorDetails(er);
      this.logger.error('MyExceptionFilter, message={message}', {
        message,
      });
    }
    // const errorMsg = i18n.translate('messages.common.BAD_REQUEST');
    const responseData = {
      ...{
        data: {},
        message: errorMsg,
        statusCode: status,
      },
      errors: transfMessages,
    };

    if (this.errorsDetails) {
      responseData['errorsDetails'] = this.errorsDetails;
      this.errorsDetails = null;
    }
    if (this.technicalError && this.isNotProductionEnv) {
      responseData['technicalError'] = this.technicalError;
      this.technicalError = null;
    }

    this.logMessage(request, message, status, exception, responseData);
    response.status(status).json(responseData);
  }

  private logMessage(
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
    const { path, method, body, query, params } = request;
    const errorData = {
      path,
      method,
      ip,
      body,
      query,
      params,
      userId: Number(request.user?.id || -1),
      appType: request.headers['app'] || null,
      status,
      correlationId: request.headers['correlation-id'],
      message: shortMsg,
      stack: exception.stack,
      context: `${method}`,
      response,
      exception,
    };
    if (status >= 500 && status < 600) {
      this.logger.error(outputMsg, errorData);
    } else if (status === 400 || status === 404) {
      this.logger.verbose(outputMsg, errorData);
    } else {
      this.logger.warn(outputMsg, errorData);
    }
  }

  private formatI18nErrors<K = Record<string, unknown>>(
    errors: string,
    i18n: I18nService<K>,
    options?: TranslateOptions,
  ): string[] {
    //* console.log('///////-- Llega--////////////');
    //* console.log(errors);
    const errorsMsgs = [];
    const isBadRoute = errors.includes('Cannot ');
    if (isBadRoute) {
      const route = errors.slice(12);
      const key = 'messages.common.BAD_ROUTE';
      const args = { route };

      const errs = i18n
        ? i18n.translate(key as Path<K>, { ...options, args })
        : 'Bad route, check';
      errorsMsgs.push(errs);
      return errorsMsgs;
    }
    for (const error of errors) {
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
                  { ...options, args },
                )
              : args.errorsDetails.description;
            delete args.errorsDetails.transl;
          }
        }
        if (args.technicalError && this.isNotProductionEnv) {
          this.technicalError = args.technicalError;
        }
        if (key !== 'EMPTY') {
          const errs = i18n.translate(key as Path<K>, { ...options, args });
          errorsMsgs.push(errs);
        }
      } catch (er) {
        this.logger.warn('{message}', {
          message: 'ERROR when try to format error output response, check',
        });
        errorsMsgs.push(error);
      }
    }
    return errorsMsgs;
  }
}
