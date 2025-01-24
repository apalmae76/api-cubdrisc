import {
  BadRequestException,
  ExecutionContext,
  createParamDecorator,
} from '@nestjs/common';
import { EAppTypes } from '../utils/constants';

export const CurrentApp = createParamDecorator(
  (data: unknown, context: ExecutionContext): EAppTypes => {
    const request = context.switchToHttp().getRequest();
    const app = EAppTypes[request.headers.app];
    if (!app) {
      throw new BadRequestException({
        message: ['messages.common.INVALID_HEADER_VALUE|{"prop":"app"}'],
      });
    }
    return app;
  },
);
