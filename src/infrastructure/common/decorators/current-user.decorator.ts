/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthUser } from 'src/infrastructure/controllers/auth/authUser.interface';
import { JwtTokenService } from 'src/infrastructure/services/jwt/jwt.service';

export const extractFreeUserFromRequest = (
  context: ExecutionContext,
): AuthUser | null => {
  const req = context.switchToHttp().getRequest();
  const user =
    req && typeof req === 'object' && 'user' in req && req.user
      ? req.user
      : null;

  if (!user) {
    return null;
  }

  const authUserInfo: AuthUser = {
    ...user,
    id: Number(user.id),
    app: user.app,
  };
  delete authUserInfo['userId'];
  return authUserInfo;
};

export const extractCurrentUserFromRequestWithAccessToken = (
  context: ExecutionContext,
  request: Request | null = null,
): AuthUser | null => {
  if (request === null) {
    request = context.switchToHttp().getRequest();
  }
  const authHeader = request.headers['authorization'];
  const token =
    authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    try {
      const currentUserExtractor = new JwtTokenService(new JwtService());
      const user = currentUserExtractor.checkToken(token);
      if (user) {
        const response: AuthUser = {
          ...user,
          id: parseInt(user.userId),
          app: user.app,
        };
        delete response['userId'];
        return response;
      }
    } catch (er: unknown) {
      //  const { message } = extractErrorDetails(er);
      //  console.log(message);
      return null;
    }
  }
  return null;
};

export const CurrentFreeUser = createParamDecorator(
  async (_, context: ExecutionContext): Promise<AuthUser> => {
    return await extractCurrentUserFromRequestWithAccessToken(context);
  },
);

export const CurrentUser = createParamDecorator(
  (_, context: ExecutionContext): AuthUser => {
    return extractFreeUserFromRequest(context);
  },
);

export const WsCurrentFreeUser = createParamDecorator(
  (_, context: any): AuthUser | null => {
    const request = context.args[0].handshake;
    const authHeader = request.headers['authorization'];
    const token =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;
    if (token) {
      try {
        const currentUserExtractor = new JwtTokenService(new JwtService());
        const user = currentUserExtractor.checkToken(token);
        if (user) {
          const response: AuthUser = {
            id: parseInt(user.userId),
            ...user,
          };
          return response;
        }
      } catch (_: unknown) {
        return null;
      }
    }
    return null;
  },
);
