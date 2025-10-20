import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RefreshTokenPayload } from 'src/domain/model/auth';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { InjectUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/inject-use-case.decorator';
import { LoginUseCases } from '../../../usecases/auth/login.usecases';
import { EnvironmentConfigService } from '../../config/environment-config/environment-config.service';
import { UseCaseProxy } from '../../usecases-proxy/usecases-proxy';

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    @InjectUseCase(LoginUseCases)
    private readonly loginUsecaseProxy: UseCaseProxy<LoginUseCases>,
    private readonly logger: ApiLoggerService,
    protected readonly envCfgServ: EnvironmentConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: envCfgServ.getJwtRefreshTokenSecret(),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: RefreshTokenPayload) {
    //* console.log(`//-JwtRefresh->payload: ${JSON.stringify(payload)}-//`);
    const refreshToken = req.get('Authorization').replace('Bearer', '').trim();
    //* console.log(`//-JwtRefresh->validate, refreshToken: ${refreshToken}-//`);
    //* console.log(payload);
    if (!payload.userId) {
      this.logger.warn('{message}', {
        userId: payload.userId,
        message: `JwtRefreshTokenStrategy: User con ID ${payload.userId} not found or hash not correct`,
      });
      throw new UnauthorizedException({
        message: ['messages.common.INVALID_TOKEN'],
      });
    }
    const user = await this.loginUsecaseProxy
      .getInstance()
      .getUserForJWTRefreshStrategy(refreshToken, payload.userId, payload.app);
    if (!user) {
      this.logger.warn('{message}', {
        userId: payload.userId,
        message: `JwtRefreshTokenStrategy: User con ID ${payload.userId} not found`,
      });
      throw new UnauthorizedException({
        message: ['messages.common.USER_NOT_FOUND'],
      });
    }
    if (user.hashRefreshToken === null) {
      this.logger.warn('{message}', {
        userId: payload.userId,
        message: `JwtRefreshTokenStrategy: User con ID ${payload.userId} token hash is invalid`,
      });
      throw new UnauthorizedException({
        message: ['messages.common.INVALID_TOKEN'],
      });
    }
    user['deviceKey'] = payload.deviceKey;
    user['app'] = payload.app;
    return user;
  }
}
