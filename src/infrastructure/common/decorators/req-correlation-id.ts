import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CorrelationId = createParamDecorator(
  (data: unknown, cxt: ExecutionContext) => {
    const request: Request = cxt.switchToHttp().getRequest();
    const correlationId = request.headers['correlation-id'];

    return correlationId;
  },
);
