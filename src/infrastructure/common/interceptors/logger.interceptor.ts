/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import ContextStorageService from 'src/infrastructure/services/context/context.interface';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { v4 as uuidv4 } from 'uuid';
import { EAppTypes } from '../utils/constants';
import { getIP } from '../utils/get-ip';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: ApiLoggerService,
    private contextStorageService: ContextStorageService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const now = Date.now();
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const { path, method, body, query, params, headers } = request;

    if (headers['correlation-id'] === undefined) {
      headers['correlation-id'] = uuidv4();
    }
    // validate required header app exist
    let appInHeader = EAppTypes[headers.app];
    if (
      !appInHeader &&
      (path === '/calls/incoming' || path === '/calls/callback')
    ) {
      appInHeader = EAppTypes.app;
    }
    const ip = getIP(headers, request.connection.remoteAddress);
    if (appInHeader) {
      this.contextStorageService.set<string>('app', appInHeader);
    } else {
      const addInfo = {
        prop: 'app',
        technicalError: `The application type sent in the request header (${headers.app}), is invalid`,
      };
      this.logger.warn('{message}', {
        message: addInfo.technicalError,
        path,
        method,
        ip,
        body,
        query,
        params,
        appInHeader,
        appType: appInHeader,
        correlationId: headers['correlation-id'],
        context: `${method}`,
      });
      throw new UnprocessableEntityException({
        message: [
          `messages.common.INVALID_HEADER_VALUE|${JSON.stringify(addInfo)}`,
        ],
      });
    }
    // validate app in user, is equal than app in header
    const appInUser = request.user?.app ?? null;
    if (appInUser && appInUser !== appInHeader) {
      const addInfo = {
        prop: 'app',
        technicalError: `The application type sent in the request header (${appInHeader}), must match the content in the authenticated user token`,
      };
      this.logger.warn('{message}', {
        message: `${addInfo.technicalError} (${appInUser})`,
        path,
        method,
        ip,
        body,
        query,
        params,
        appType: appInUser,
        appInHeader,
        appInUser,
        correlationId: headers['correlation-id'],
        context: `${method}`,
      });
      throw new ForbiddenException({
        message: [
          `messages.common.INVALID_HEADER_VALUE|${JSON.stringify(addInfo)}`,
        ],
      });
    }
    const userId = Number(request.user?.id || -1);
    this.logger.info('Incoming request on {path} ===============', {
      path,
      method,
      body,
      query,
      params,
      ip,
      userId,
      appType: appInHeader,
      appInUser,
      correlationId: headers['correlation-id'],
      context: `${method}`,
    });

    return next.handle().pipe(
      tap({
        next: (response) => {
          const status = response?.statusCode ?? 'OK';
          this.logger.info(
            'End request for {path}, status {status}, duration={duration}ms ============',
            {
              path,
              method,
              ip,
              userId,
              appType: appInHeader,
              correlationId: request.headers['correlation-id'],
              response,
              status,
              duration: Date.now() - now,
              context: `${method}`,
            },
          );
        },
      }),
    );
  }
}
