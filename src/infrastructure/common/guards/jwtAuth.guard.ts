/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { CanActivate, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { AuthUser } from 'src/infrastructure/controllers/auth/authUser.interface';
import { JwtTokenService } from 'src/infrastructure/services/jwt/jwt.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  async canActivate(context: any): Promise<boolean | any> {
    const authHeader = context.args[0].handshake.headers['authorization'];
    const app = context.args[0].handshake.headers['app'];
    const token =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;
    if (token) {
      try {
        const currentUserExtractor = new JwtTokenService(new JwtService());
        const user = await currentUserExtractor.checkToken(token);
        if (user.app !== app) {
          return false;
        }
        if (user) {
          const response: AuthUser = {
            id: parseInt(user.userId),
            ...user,
          };
          return response;
        }
      } catch (er) {
        return false;
      }
    }
    return false;
  }
}
