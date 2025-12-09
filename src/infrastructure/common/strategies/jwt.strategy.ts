import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenPayload } from 'src/domain/model/auth';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { DatabaseUserRepository } from 'src/infrastructure/repositories/user.repository';
import { IApiLogger } from 'src/infrastructure/services/logger/logger.interface';
import { API_LOGGER_KEY } from 'src/infrastructure/services/logger/logger.module';
import { RE_INT_NUMBER } from '../utils/constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersRepo: DatabaseUserRepository,
    protected readonly appConfig: EnvironmentConfigService,
    @Inject(API_LOGGER_KEY) private readonly logger: IApiLogger,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: appConfig.getJwtTokenSecret(),
    });
  }

  async validate(payload: TokenPayload) {
    try {
      if (!RE_INT_NUMBER.test(`${payload.userId}`)) {
        this.logger.warn('{message}', {
          payload,
          message: 'JwtStrategy: User ID incorrecto',
        });
        throw new UnauthorizedException({
          message: ['messages.common.USER_NOT_FOUND'],
        });
      }
      const user = await this.usersRepo.updateLastLogin(
        payload.userId,
        payload.app,
      );
      if (!user) {
        this.logger.warn('JwtStrategy: User con ID {userId} not found', {
          payload,
          message: `JwtStrategy: User con ID ${payload.userId} not found`,
          userId: payload.userId,
        });
        throw new UnauthorizedException({
          message: ['messages.common.USER_NOT_FOUND'],
        });
      }
      if (user.hashRefreshToken === null) {
        this.logger.verbose('JwtStrategy: User con ID: {userId} not logged', {
          payload,
          message: `JwtStrategy: User con ID ${payload.userId} not logged`,
          userId: payload.userId,
        });
        throw new Error('USER_NOT_LOGGED');
      }
      user['deviceKey'] = payload.deviceKey;
      user['app'] = payload.app;
      return user;
    } catch (er) {
      const message = er.message ? er.message : 'No message defined';
      if (!message.includes('USER_NOT_LOGGED')) {
        this.logger.warn('JwtStrategy: Error getting user data; {message}', {
          payload,
          message,
        });
        throw new ForbiddenException({
          message: ['messages.common.USER_NOT_LOGGED'],
        });
      }
      throw new UnauthorizedException({
        message: ['messages.common.USER_NOT_LOGGED'],
      });
    }
  }
}
