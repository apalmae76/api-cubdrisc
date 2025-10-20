import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bull';
import { I18nContext } from 'nestjs-i18n';
import { EmailJobData } from 'src/domain/adapters/email-job-data';
import { UserModel } from 'src/domain/model/user';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { EAppTypes } from 'src/infrastructure/common/utils/constants';
import { extractErrorDetails } from 'src/infrastructure/common/utils/extract-error-details';
import { JwtGetToken } from 'src/infrastructure/common/utils/jwt-get-token';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { LogginEmailOTPDto } from 'src/infrastructure/controllers/auth/auth-dto.class';
import {
  GetAuthTokensPresenter,
  RefreshTokenPresenter,
} from 'src/infrastructure/controllers/auth/auth.presenter';
import { AuthUser } from 'src/infrastructure/controllers/auth/authUser.interface';
import {
  EAppRoles,
  cRolesAppGrantAccess,
} from 'src/infrastructure/controllers/auth/role.enum';
import { DatabaseUserRepository } from 'src/infrastructure/repositories/user.repository';
import { BcryptService } from 'src/infrastructure/services/bcrypt/bcrypt.service';
import { JwtTokenService } from 'src/infrastructure/services/jwt/jwt.service';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { ApiRedisService } from 'src/infrastructure/services/redis/redis.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';
interface IUserNeeds {
  id: number;
  roles: EAppRoles[];
  fullName?: string;
  isEmailVerified: boolean;
  email?: string;
}

interface ILoginResponse {
  message: string;
  expirationTime: number;
  userId: number;
}
@InjectableUseCase()
export class LoginUseCases extends JwtGetToken {
  private readonly syncProcessExistFrom = new Date('2024-04-14 01:00:00');
  constructor(
    protected readonly jwtTokenService: JwtTokenService,
    protected readonly appConfig: EnvironmentConfigService,
    protected readonly redisService: ApiRedisService,
    protected readonly userRepo: DatabaseUserRepository,
    protected readonly bcryptService: BcryptService,
    protected readonly dataSource: DataSource,
    protected readonly logger: ApiLoggerService,
  ) {
    super(
      jwtTokenService,
      appConfig,
      userRepo,
      bcryptService,
      redisService,
      logger,
    );
    this.context = `${LoginUseCases.name}.`;
  }

  async sendLogInEmailOtpCode(
    email: string,
    emailSyncQueue: Queue<EmailJobData>,
    app: EAppTypes,
  ): Promise<ILoginResponse> {
    const context = `${this.context}sendLogInEmailOtpCode`;
    const user = await this.validateEmail(email, app);
    // Elimino cualquier registro de existir
    const cacheKey = `SYSTEM:OTP:${app}:${email}`;
    await this.redisService.del(cacheKey);
    // Get OTP 6D Code
    const { otpCode, isTestingUser } = await super.getOTP6D(
      context,
      email,
      user.id,
    );
    // Guardo la data en Redis
    const expirationTime = this.appConfig.getOtpEmailExpirationTime();
    // Registro la data del usuario en Redis
    await this.redisService.set<string>(cacheKey, otpCode, expirationTime);
    try {
      if (!isTestingUser && this.appConfig.isNotLocalEnv()) {
        await this.sendMailOTPMessage(email, otpCode, emailSyncQueue);
      }
      return {
        message: 'messages.common.EMAIL_OTP_SENDED',
        expirationTime,
        userId: user.id,
      };
    } catch (er: unknown) {
      await this.redisService.del(cacheKey);
      await this.personalizeError(er, context);
    }
  }

  private async sendMailOTPMessage(
    email: string,
    code: string,
    emailSyncQueue: Queue<EmailJobData>,
  ): Promise<boolean> {
    const context = `${this.context}sendMailOTPMessage`;
    const i18n = I18nContext.current();
    const html = i18n.translate('messages.login.SEND_EMAIL_OTP_CODE', {
      args: { code },
    });
    const subject = i18n.translate(
      'messages.profile.SEND_EMAIL_OTP_CODE_SUBJECT',
    );
    const data: EmailJobData = {
      mailType: 'Registry OTP verification',
      mailOptions: {
        subject: subject,
        to: email,
        html: html,
      },
    };
    this.logger.debug('Starting', {
      context,
      data,
    });
    try {
      // Sync whith bull method
      await emailSyncQueue.add(data);
      return true;
    } catch (er: unknown) {
      const { message } = extractErrorDetails(er);
      this.logger.warn('Ends with error; {message}', {
        context: `${context}.catch`,
        message,
      });
      return false;
    }
  }

  async getRefreshTokens(
    user: AuthUser,
    app: EAppTypes,
  ): Promise<BaseResponsePresenter<RefreshTokenPresenter>> {
    const context = `${this.context}getRefreshTokens`;
    this.logger.debug('Starting', {
      context,
      user,
    });
    try {
      const validUser = await this.validateUser(user, app);
      this.logger.debug('Validating', {
        context,
        validUser,
      });
      const { accessToken } = await super.getJwtToken(
        user.id,
        app,
        validUser.roles,
      );
      const refreshToken = await super.getJwtRefreshToken(user.id, app);

      const response = new RefreshTokenPresenter(
        accessToken,
        refreshToken,
        validUser.id,
        validUser.email,
      );
      const message = 'messages.common.TOKEN_REFRESH_SUCESS';
      return new BaseResponsePresenter(message, response);
    } catch (er: unknown) {
      await this.personalizeError(er, context);
    }
  }

  async authenticateUserByOtpEmail(
    userData: LogginEmailOTPDto,
    app: EAppTypes,
  ): Promise<BaseResponsePresenter<GetAuthTokensPresenter>> {
    const context = `${this.context}authenticateUserByOtpEmail`;
    try {
      await this.validateOtpCode(userData.email, app, userData.otpCode);
      const user = await this.validateEmail(userData.email, app);
      this.logger.debug('Starting', {
        context,
        data: userData,
        user,
      });
      const { accessToken } = await super.getJwtToken(user.id, app, user.roles);
      const refreshToken = await super.getJwtRefreshToken(user.id, app);
      const response = new GetAuthTokensPresenter(
        accessToken,
        refreshToken,
        true,
        user.fullName,
        user.id,
        user.email,
      );
      const message = 'messages.common.USER_LOGGED';
      return new BaseResponsePresenter(message, response);
    } catch (er: unknown) {
      await this.personalizeError(er, context);
    }
  }

  private async validateOtpCode(
    user: string,
    app: EAppTypes,
    codeToVerify: string,
  ) {
    const context = `${this.context}validateOtpCode`;
    const cacheKey = `SYSTEM:OTP:${app}:${user}`;

    const storedOtp = await this.redisService.get<string>(cacheKey);
    if (storedOtp) {
      const cacheKeyFail = `SYSTEM:OTP:FAILED:${app}:${user}`;
      if (codeToVerify.toString() === storedOtp.toString()) {
        this.logger.debug('OTP match successful', {
          context,
          data: storedOtp,
        });
        await this.redisService.del(cacheKey);
        await this.redisService.del(cacheKeyFail);
        return true;
      } else {
        // validate failed OTP sending errors
        await super.manageFailedOTP(user, cacheKeyFail, context);
      }
    } else {
      const infoData = {
        user,
        context: 'login',
      };
      await super.getExpiredOTPError(infoData, context);
    }
  }

  private async validateUser(
    user: AuthUser,
    app: EAppTypes,
  ): Promise<IUserNeeds> {
    const context = `${this.context}validateUser`;
    if (app !== user.app) {
      throw new ForbiddenException({
        message: [
          `messages.common.INVALID_APP_OR_TOKEN|{"userId":"${user.id}"}`,
        ],
      });
    }

    const userExistAndGetIt = await this.userRepo.getHashRT(user.id, app);
    this.logger.debug('Get hash', {
      context,
      userId: user.id,
      app,
      result: userExistAndGetIt,
    });
    if (!userExistAndGetIt) {
      throw new BadRequestException({
        message: [
          `validation.login.USER_NOT_REGISTERED|{"userId":"${user.id}"}`,
        ],
      });
    }
    return {
      id: userExistAndGetIt.id,
      roles: userExistAndGetIt.roles,
      isEmailVerified: userExistAndGetIt.email !== null,
      email: userExistAndGetIt.email,
    };
  }

  private async validateEmail(
    email: string,
    app: EAppTypes,
  ): Promise<IUserNeeds> {
    const context = `${this.context}validateEmail`;
    const user = await this.userRepo.getByEmail(email, true);
    this.logger.debug('Get user data', {
      context,
      result: user,
    });
    if (!user) {
      throw new NotFoundException({
        message: [`validation.login.EMAIL_NOT_REGISTERED|{"email":"${email}"}`],
      });
    }

    const userVerifiedData = await this.verifyUserData(user, app);
    this.logger.debug('User verified successfully', {
      userVerifiedData,
      context,
    });
    return userVerifiedData;
  }

  private async verifyUserData(
    user: UserModel,
    app: EAppTypes,
  ): Promise<IUserNeeds> {
    const context = `${this.context} verifyUserData`;
    const roles = cRolesAppGrantAccess[app].filter((role) =>
      user.roles.includes(role),
    );
    if (roles.length === 0) {
      this.logger.verbose(
        'Denied access to the requested service, insufficient privileges',
        { user, context },
      );
      throw new ForbiddenException({
        message: [`messages.login.DENNY_ACCESS_BY_ROL`],
      });
    }

    return {
      id: user.id,
      roles,
      fullName: user.fullName,
      isEmailVerified: user.email !== null,
      email: user.email,
    };
  }

  async getUserForJWTRefreshStrategy(
    refreshToken: string,
    userId: number,
    app: EAppTypes,
  ) {
    const user = await this.userRepo.getHashRT(userId, app);
    if (!user) {
      return null;
    }
    if (user.hashRefreshToken === null) {
      return user;
    }
    const isRefreshTokenMatching = await this.bcryptService.compare(
      refreshToken,
      user.hashRefreshToken,
    );
    if (isRefreshTokenMatching) {
      return user;
    } else {
      user.hashRefreshToken = null;
    }
    return user;
  }
}
