import { BadRequestException } from '@nestjs/common';
import { Queue } from 'bull';
import { I18nContext } from 'nestjs-i18n';
import { EmailJobData } from 'src/domain/adapters/email-job-data';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';
import { EAppTypes } from 'src/infrastructure/common/utils/constants';
import { extractErrorDetails } from 'src/infrastructure/common/utils/extract-error-details';
import { JwtGetToken } from 'src/infrastructure/common/utils/jwt-get-token';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { GetAuthTokensPresenter } from 'src/infrastructure/controllers/auth/auth.presenter';
import { EAppRoles } from 'src/infrastructure/controllers/auth/role.enum';
import {
  UpdateEmailOTPDto,
  VerifyEmailOTPDto,
} from 'src/infrastructure/controllers/profile/profile-dto.class';
import { DatabaseEmailRepository } from 'src/infrastructure/repositories/email.repository';
import { DatabaseUserRepository } from 'src/infrastructure/repositories/user.repository';
import { BcryptService } from 'src/infrastructure/services/bcrypt/bcrypt.service';
import { JwtTokenService } from 'src/infrastructure/services/jwt/jwt.service';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { ApiRedisService } from 'src/infrastructure/services/redis/redis.service';
import { InjectableUseCase } from 'src/infrastructure/usecases-proxy/plugin/decorators/injectable-use-case.decorator';
import { DataSource } from 'typeorm';

@InjectableUseCase()
export class UpdUserEmailWithOtpUseCases extends JwtGetToken {
  constructor(
    protected readonly userRepo: DatabaseUserRepository,
    private readonly emailRepo: DatabaseEmailRepository,
    private readonly dataSource: DataSource,
    protected readonly appConfig: EnvironmentConfigService,
    protected readonly bcryptService: BcryptService,
    protected readonly jwtTokenService: JwtTokenService,
    protected readonly redisService: ApiRedisService,
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
    this.context = `${UpdUserEmailWithOtpUseCases.name}.`;
  }

  async sendEmailOtpVerification(
    userId: number,
    dataDto: UpdateEmailOTPDto,
    emailSyncQueue: Queue<EmailJobData>,
    correlationId?: string,
  ): Promise<BaseResponsePresenter<null>> {
    const context = `${this.context}sendEmailOtpVerification`;
    try {
      await this.validate(userId, dataDto.email);
      await this.createEmailUserRegistryData(
        userId,
        dataDto,
        emailSyncQueue,
        correlationId,
      );
      return new BaseResponsePresenter('messages.common.EMAIL_OTP_SENDED');
    } catch (er: unknown) {
      await this.personalizeError(er, context);
    }
  }

  private async validate(userId: number, email: string) {
    const context = `${this.context}validate`;
    const mailInUse = await this.userRepo.isEmailInUse(email);
    this.logger.debug('Starting', {
      userId,
      email,
      mailInUse,
      context,
    });
    if (mailInUse) {
      throw new BadRequestException({
        message: [
          `validation.register.EMAIL_IN_USE|{"userId":"${userId}","email":"${email}"}`,
        ],
      });
    }
    await this.userRepo.ensureExistOrFail(userId);
  }

  private async createEmailUserRegistryData(
    userId: number,
    dataDto: UpdateEmailOTPDto,
    emailSyncQueue: Queue<EmailJobData>,
    correlationId?: string,
  ) {
    const context = `${this.context}createEmailUserRegistryData`;
    // Get OTP Code
    const { otpCode } = await super.getOTP6D(context, dataDto.email, userId);
    const cacheKey = `SYSTEM:OTP:${userId}:${dataDto.email}`;
    await this.redisService.del(cacheKey);
    const expOtpTime = this.appConfig.getOtpEmailExpirationTime();
    // Guardo la data en Redis
    await this.redisService.set<string>(cacheKey, otpCode, expOtpTime);
    if (this.appConfig.isNotLocalEnv()) {
      await this.sendMailOTPMessage(
        dataDto.email,
        otpCode,
        cacheKey,
        emailSyncQueue,
        correlationId,
      );
    }
  }

  private async sendMailOTPMessage(
    email: string,
    code: string,
    cacheKey: string,
    emailSyncQueue: Queue<EmailJobData>,
    correlationId?: string,
  ): Promise<boolean> {
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
      correlationId,
    };
    try {
      // Sync whith bull method
      emailSyncQueue.add(data);
      return true;
    } catch (er: unknown) {
      const { message } = extractErrorDetails(er);
      await this.redisService.del(cacheKey);
      this.logger.warn('Update user email ends with error; {message}', {
        message,
        context: 'UpdUserEmailWithOtpUseCases.sendMailOTPMessage.catch',
      });
    }
  }

  async verifyEmailOtpCode(
    userId: number,
    dataDto: UpdateEmailOTPDto,
    context = null,
  ): Promise<string> {
    context = context
      ? `${context}.verifyEmailOtpCode`
      : `${this.context}verifyEmailOtpCode`;
    try {
      const cacheKey = `SYSTEM:OTP:${userId}:${dataDto.email}`;
      const cacheKeyFail = `SYSTEM:EMAIL-FAIL:${userId}:${dataDto.email}`;
      this.logger.debug('Starting', {
        cacheKey,
        data: dataDto,
        context,
      });
      const storedOtp = await this.redisService.get<string>(cacheKey);
      if (storedOtp) {
        const isSameUserAndEmail =
          storedOtp.toString() === dataDto.otpCode.toString();
        if (isSameUserAndEmail) {
          this.logger.debug('Same user', {
            data: storedOtp,
            context,
          });
          await this.validate(userId, dataDto.email);
          await this.userEmailBDPersist(
            userId,
            dataDto.email,
            cacheKey,
            cacheKeyFail,
          );
          return cacheKey;
        } else {
          // manage failed OTP sending errors
          await super.manageFailedOTP(dataDto.email, cacheKeyFail, context);
        }
      } else {
        const infoData = {
          email: dataDto.email,
          context: 'updateUserEmail',
        };
        await super.getExpiredOTPError(infoData, context);
      }
    } catch (er: unknown) {
      await this.personalizeError(er, context);
    }
  }

  async registryVerifyEmailOtpCode(
    userId: number,
    dataDto: VerifyEmailOTPDto,
    app: EAppTypes,
  ): Promise<BaseResponsePresenter<GetAuthTokensPresenter>> {
    const context = `${this.context}.registryVerifyEmailOtpCode`;
    try {
      await this.verifyEmailOtpCode(userId, dataDto);
      const { accessToken } = await super.getJwtToken(userId, app, [
        EAppRoles.MEDIC,
      ]);
      const refreshToken = await super.getJwtRefreshToken(userId, app);
      const response = new GetAuthTokensPresenter(
        accessToken,
        refreshToken,
        true,
      );
      const message = 'messages.common.USER_MAIL_REGISTRY_SUCESS';
      return new BaseResponsePresenter(message, response);
    } catch (er: unknown) {
      await this.personalizeError(er, context);
    }
  }

  private async userEmailBDPersist(
    userId: number,
    email: string,
    cacheKey: string,
    cacheKeyFail: string,
  ): Promise<boolean> {
    const context = `${this.context}userEmailBDPersist`;
    try {
      this.logger.debug('Starting', {
        userId,
        email,
        context,
      });
      await this.dataSource.transaction(async (em) => {
        await this.userRepo.setEmail(userId, email, em);
        await this.emailRepo.create(userId, email, em);
      });
      await this.redisService.del(cacheKey);
      await this.redisService.del(cacheKeyFail);
      return true;
    } catch (er: unknown) {
      await this.redisService.del(cacheKey);
      await this.personalizeError(er, context);
    }
  }
}
