/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthUser } from 'src/infrastructure/controllers/auth/authUser.interface';
import { JwtTokenService } from 'src/infrastructure/services/jwt/jwt.service';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest();
    const user = request && request.user ? request.user : null;
    if (user) {
      const response: AuthUser = {
        ...user,
        id: Number(user.id),
        app: user.app,
      };
      delete response['userId'];
      return response;
    }
    return null;
  },
);

export const CurrentFreeUser = createParamDecorator(
  async (data: unknown, context: ExecutionContext): Promise<AuthUser> => {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    const token =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;
    if (token) {
      try {
        const currentUserExtractor = new JwtTokenService(new JwtService());
        const user = await currentUserExtractor.checkToken(token);
        if (user) {
          const response: AuthUser = {
            ...user,
            id: parseInt(user.userId),
            app: user.app,
          };
          delete response['userId'];
          return response;
        }
      } catch (er) {
        return null;
      }
    }
    return null;
  },
);

export const WsCurrentFreeUser = createParamDecorator(
  async (data: unknown, context: any): Promise<AuthUser | null> => {
    const request = context.args[0].handshake;
    const authHeader = request.headers['authorization'];
    const token =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;
    if (token) {
      try {
        const currentUserExtractor = new JwtTokenService(new JwtService());
        const user = await currentUserExtractor.checkToken(token);
        if (user) {
          const response: AuthUser = {
            id: parseInt(user.userId),
            ...user,
          };
          return response;
        }
      } catch (er) {
        return null;
      }
    }
    return null;
  },
);
