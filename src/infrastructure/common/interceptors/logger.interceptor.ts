/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NestInterceptor,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import ContextStorageService from 'src/infrastructure/services/context/context.interface';
import { IApiLogger } from 'src/infrastructure/services/logger/logger.interface';
import { API_LOGGER_KEY } from 'src/infrastructure/services/logger/logger.module';
import { v4 as uuidv4 } from 'uuid';
import { extractCurrentUserFromRequestWithAccessToken } from '../decorators/current-user.decorator';
import { EAppTypes } from '../utils/constants';
import { getIP } from '../utils/get-ip';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  constructor(
    @Inject(API_LOGGER_KEY) private readonly logger: IApiLogger,
    private contextStorageService: ContextStorageService,
  ) { }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const now = Date.now();
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const { path, baseUrl, method, body, query, params, headers } = request;
    if (headers['correlation-id'] === undefined) {
      headers['correlation-id'] = uuidv4();
    }
    // validate required header app exist
    let appInHeader =
      headers.app && EAppTypes[headers.app] ? EAppTypes[headers.app] : null;
    const versionInHeader = headers.version ?? '?';
    const routesWithNoAppHeader = ['/calls/incoming', '/calls/callback'];
    if (!appInHeader && routesWithNoAppHeader.includes(path)) {
      appInHeader = EAppTypes.app;
    }
    const ip = getIP(headers, request.connection.remoteAddress);
    if (versionInHeader !== '?') {
      this.contextStorageService.set<string>('frontVersion', versionInHeader);
    }
    const logData = {
      path: path === '/' ? baseUrl : path,
      method,
      body,
      query,
      params,
      ip,
      userId: Number(request.user?.id ?? -1),
      deviceKey: request.user?.deviceKey ?? '?',
      appType: appInHeader,
      userAgent: headers['user-agent'] ?? 'NULL',
      frontVersion: versionInHeader,
      correlationId: headers['correlation-id'],
      context: `${method}`,
      localContext: `${LoggerInterceptor.name}.intercept`,
      message: undefined,
      appInHeader: undefined,
      appInUserToken: request.user?.app ?? null,
    };
    if (logData.userId === -1) {
      const user = await extractCurrentUserFromRequestWithAccessToken(
        null,
        request,
      );
      if (user) {
        logData.userId = user.id;
        logData.appInUserToken = user.app;
        logData.deviceKey = user.deviceKey;
        logData.appInUserToken = user.app;
      }
    }
    if (appInHeader) {
      this.contextStorageService.set<string>('app', appInHeader);
    } else {
      const app = headers.app ?? '?';
      const addInfo = {
        prop: 'app',
        technicalError: `The application type sent in the 'app' header (${app}), is invalid`,
      };
      logData.message = addInfo.technicalError;
      logData.appType = app;
      logData.appInHeader = app;
      logData.localContext = `${logData.localContext}.warn`;
      this.logger.warn('{message}', logData);
      throw new UnprocessableEntityException({
        message: [
          `messages.common.INVALID_HEADER_VALUE_APP|${JSON.stringify(addInfo)}`,
        ],
      });
    }
    // validate app in user, is equal than app in header
    if (logData.appInUserToken && logData.appInUserToken !== appInHeader) {
      const addInfo = {
        prop: 'app',
        technicalError: `The application type sent in the 'app' header (${appInHeader}), must match the content in the authenticated user token`,
      };
      logData.message = `${addInfo.technicalError} (${logData.appInUserToken})`;
      this.logger.warn('{message}', logData);
      throw new ForbiddenException({
        message: [
          `messages.common.INVALID_HEADER_VALUE_APP|${JSON.stringify(addInfo)}`,
        ],
      });
    }

    this.logger.info('Incoming request on {path} ===============', logData);

    return next.handle().pipe(
      tap({
        next: (response) => {
          const status = response?.statusCode ?? 'OK';
          this.logger.info(
            'End request for {path}, status {status}, duration={duration}ms ============',
            {
              ...logData,
              response,
              status,
              duration: Date.now() - now,
            },
          );
        },
      }),
    );
  }
}
