import { BadRequestException } from '@nestjs/common';
import * as otpGenerator from 'otp-generator';
import { IJwtServicePayload } from 'src/domain/adapters/jwt.interface';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import {
  EAppRoles,
  cRolesAppGrantAccess,
} from 'src/infrastructure/controllers/auth/role.enum';
import { DatabaseUserRepository } from 'src/infrastructure/repositories/user.repository';
import { BcryptService } from 'src/infrastructure/services/bcrypt/bcrypt.service';

import { JwtTokenService } from 'src/infrastructure/services/jwt/jwt.service';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { ApiRedisService } from 'src/infrastructure/services/redis/redis.service';
import { UseCaseBase } from 'src/usecases/usecases.base';
import { EAppTypes, RE_PHONE, TESTING_USER_EMAIL } from './constants';

export interface IGetOTPData {
  otpCode: string;
  isTestingUser: boolean;
}

export enum IOtpType {
  PHONE_REGISTRY = 'PHONE_REGISTRY',
  PHONE_UDP = 'PHONE_UDP',
  EMAIL_REGISTRY = 'EMAIL_REGISTRY',
  EMAIL_UDP = 'EMAIL_UDP',
}
export class JwtGetToken extends UseCaseBase {
  constructor(
    protected readonly jwtTokenService: JwtTokenService,
    protected readonly appConfig: EnvironmentConfigService,
    protected readonly userRepo: DatabaseUserRepository,
    protected readonly bcryptService: BcryptService,
    protected readonly redisService: ApiRedisService,
    protected readonly logger: ApiLoggerService,
  ) {
    super(logger);
    this.contextTitle = 'Get token (base): ';
    this.context = `${JwtGetToken.name}.`;
  }

  public async getJwtToken(userId: number, app: EAppTypes, roles: EAppRoles[]) {
    // Appropriate roles are maintained according to the app type
    roles = cRolesAppGrantAccess[app].filter((role) => roles.includes(role));
    const payload: IJwtServicePayload = { userId, app, roles };
    const secret = this.appConfig.getJwtTokenSecret();
    const expiresIn = this.appConfig.getJwtTokenExpirationTime() + 's';
    this.logger.info(`${this.contextTitle}User have been logged`, {
      userId: Number(userId),
      app,
      roles,
      expiresIn,
      context: `${this.context}getJwtToken`,
    });
    const token = this.jwtTokenService.createAuthToken(
      payload,
      secret,
      expiresIn,
    );
    return {
      accessToken: token,
    };
  }

  protected async getJwtRefreshToken(userId: number, app: EAppTypes) {
    // Add TokenData here
    // const user = await this.userRepo.getUserById(userId, true);
    const payload: IJwtServicePayload = { userId, app };
    const secret = this.appConfig.getJwtRefreshTokenSecret();
    const expiresIn = this.appConfig.getJwtRefreshTokenExpirationTime() + 's';
    this.logger.info(`${this.contextTitle}User have been logged, refresh`, {
      userId: Number(userId),
      app,
      expiresIn,
      context: `${this.context}getJwtRefreshToken`,
    });
    const refreshToken = this.jwtTokenService.createAuthToken(
      payload,
      secret,
      expiresIn,
    );
    await this.setJwtRefreshToken(refreshToken, userId, app);
    return refreshToken;
  }

  protected async setJwtRefreshToken(
    refreshToken: string,
    userId: number,
    app: EAppTypes,
  ) {
    const currentHRT = await this.bcryptService.hash(refreshToken);
    await this.userRepo.updateHashRT(userId, app, currentHRT);
  }

  protected async manageFailedOTP(
    user: string,
    cacheKeyFail: string,
    context: string,
  ) {
    let failedAttempts = await this.redisService.get<number>(cacheKeyFail);
    this.logger.debug('OTP NOT match', {
      context,
      failedAttempts,
    });
    failedAttempts = failedAttempts ? failedAttempts + 1 : 1;
    const cacheTime = this.appConfig.getOtpEmailExpirationTime();
    await this.redisService.set<number>(
      cacheKeyFail,
      failedAttempts,
      cacheTime,
      true,
    );
    let personalizedError = 'validation.login.BAD_OTP';
    if (failedAttempts >= 3) {
      const addInfo = {
        errorsDetails: {
          code: 'HELP',
          transl: false,
        },
      };
      personalizedError = `${personalizedError}|${JSON.stringify(addInfo)}`;
    }
    this.logger.verbose('Failed attemp {failedAttempts}', {
      context: `${context}.failAttempt`,
      failedAttempts,
      cacheKeyFail,
      cacheTime,
      marker: 'FailedOTP',
    });
    throw new BadRequestException({ message: [personalizedError] });
  }

  protected async getOTP6D(
    context: string,
    user: string,
    userId: number = null,
  ): Promise<IGetOTPData> {
    const isTestingUser = user === TESTING_USER_EMAIL;
    let addLog = '';
    let marker = '';
    if (isTestingUser) {
      marker = 'LOGGIN_TESTING_USER';
      addLog = 'Is testin user';
    }
    const isPhoneAuth = RE_PHONE.test(user);
    this.logger.verbose(`Get otpCode${addLog}`, {
      context: `${context}.getOTP6D`,
      user,
      forUserId: userId,
      isPhoneAuth,
      marker,
    });
    const cacheKey = `SYSTEM:OTP:USER_COUNT:${userId ? userId : user}`;
    const baseOtpTime = await this.appConfig.getOtpBlockingTime();
    // Get user otp count from Redis
    let otpCount = await this.redisService.get<number>(cacheKey);
    otpCount = otpCount ? otpCount + 1 : 1;
    // Guardo la data en Redis
    await this.redisService.set<number>(cacheKey, otpCount, baseOtpTime, true);
    // validate if not exceed limit of otp request, notify panel if true
    const sysMaxOtp = await this.appConfig.getOtpMaxAllowedCount();
    if (otpCount > sysMaxOtp) {
      const cacheBlockKey = `SYSTEM:OTP:USER_BLOCKED:${userId ? userId : user}`;
      let isUserOtpBlocked =
        await this.redisService.get<boolean>(cacheBlockKey);
      if (!isUserOtpBlocked) {
        await this.redisService.set<boolean>(cacheBlockKey, true, baseOtpTime);
        isUserOtpBlocked = true;
      }
      if (isUserOtpBlocked) {
        this.logger.debug(
          'Number of OTP requests allowed at one time is exceeded, otp is blocked for {user}',
          {
            context,
            user,
            sysMaxOtp,
            otpCount,
          },
        );
        let countOtpTime = await this.redisService.ttl(cacheBlockKey);
        countOtpTime = countOtpTime ? countOtpTime : baseOtpTime;
        let time = Math.floor(countOtpTime / 60);
        let timeError = 'OTP_IS_BLOCKED_MINS';
        if (countOtpTime < 60) {
          time = Math.floor(countOtpTime % 60);
          timeError = 'OTP_IS_BLOCKED_SECS';
        }
        throw new BadRequestException({
          message: [
            `validation.login.${timeError}|{"user":"${user}","time":"${time}"}`,
          ],
        });
      }
    }
    const isNotProdEnv = this.appConfig.isNotProductionEnv();
    const otpCode = isTestingUser
      ? '666666'
      : isNotProdEnv
        ? await this.getOtpForDevEnv(user, isPhoneAuth)
        : otpGenerator.generate(6, {
          digits: true,
          lowerCaseAlphabets: false,
          upperCaseAlphabets: false,
          specialChars: false,
        });

    if (isNotProdEnv) {
      this.logger.debug('->>>> OTP View OTP -{otpCode}-', {
        context,
        otpCode,
        marker: 'OTP-CODE',
      });
    }
    return { otpCode, isTestingUser };
  }

  private async getOtpForDevEnv(
    user: string,
    isPhoneAuth: boolean,
  ): Promise<string> {
    if (isPhoneAuth) {
      return user.startsWith('+') ? user.slice(1, 7) : user.slice(0, 6);
    }
    // get phone by email
    const userPhone = await this.userRepo.getByEmail(user, true);
    if (userPhone && userPhone.phone) {
      return userPhone.phone.startsWith('+')
        ? userPhone.phone.slice(1, 7)
        : userPhone.phone.slice(0, 6);
    }
    return '900009';
  }

  protected async getExpiredOTPError(errorData: object, context: string) {
    this.logger.debug('Bad or expired OTP', {
      context,
    });
    const addInfo = {
      ...errorData,
      errorsDetails: {
        code: 'HELP',
        transl: false,
      },
    };
    throw new BadRequestException({
      message: [
        `validation.login.BAD_OR_EXPIRED_OTP|${JSON.stringify(addInfo)}`,
      ],
    });
  }
}
