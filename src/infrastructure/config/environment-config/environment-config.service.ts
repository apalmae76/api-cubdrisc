import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IMailConfig } from 'src/domain/config/mail.interface';
import { IRedisConfig } from 'src/domain/config/redis.interface';
import { IDatabaseConfig } from '../../../domain/config/database.interface';
import { IJWTConfig } from '../../../domain/config/jwt.interface';

@Injectable()
// IAppBaseEnvConfig,
export class EnvironmentConfigService
  implements IDatabaseConfig, IJWTConfig, IRedisConfig, IMailConfig {
  constructor(private configService: ConfigService) { }

  // Aplication data --------------------------------------------
  getAppVersion(): string {
    return '0.1.20251026';
  }
  getAppName(): string {
    return 'CUBDRISC api';
  }

  // APP SERVER ------------------------------------------------
  isStagingEnv(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'staging';
  }
  isProductionEnv(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }
  isNotProductionEnv(): boolean {
    return this.configService.get<string>('NODE_ENV') !== 'production';
  }
  isNotLocalEnv(): boolean {
    return this.configService.get<string>('NODE_ENV') !== 'local';
  }

  isLocalEnv(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'local';
  }

  isDevelopEnv(): boolean {
    return (
      this.configService.get<string>('NODE_ENV') === 'local' ||
      this.configService.get<string>('NODE_ENV') === 'development'
    );
  }

  isDevelopmentEnv(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'development';
  }

  getNodeEnv(): string {
    return this.configService.get<string>('NODE_ENV');
  }

  getBaseUrlWeb(): string {
    return this.configService.get<string>('BASE_URL_WEB');
  }

  getBaseUrlPanel(): string {
    return this.configService.get<string>('BASE_URL_PANEL');
  }

  getBasePanelFullByEnvUrl(): string {
    const baseDomain: string = this.getBaseUrlPanel();
    return this.isProductionEnv()
      ? `https://${baseDomain}`
      : this.isStagingEnv()
        ? `https://stg${baseDomain}`
        : `https://dev${baseDomain}`;
  }

  getBaseWebFullByEnvUrl(): string {
    const baseDomain: string = this.getBaseUrlWeb();
    return this.isProductionEnv()
      ? `https://${baseDomain}`
      : this.isStagingEnv()
        ? `https://stg.${baseDomain}`
        : `https://dev.${baseDomain}`;
  }

  getBaseApiFullByEnvUrl(): string {
    const baseDomain: string = this.getBaseUrlWeb();
    return this.isProductionEnv()
      ? `https://api.${baseDomain}`
      : this.isStagingEnv()
        ? `https://stgapi.${baseDomain}`
        : this.isDevelopmentEnv()
          ? `https://devapi.${baseDomain}`
          : `http://localhost:${this.getPort()}`;
  }

  getPort(): number {
    return this.configService.get<number>('PORT');
  }

  getListOfAuthorizedAddresses(): string {
    return this.configService.get<string>('LIST_OF_AUTHORIZED_ADDRESSES');
  }

  getLogLevel(): string {
    return this.configService.get<string>('LOG_LEVEL');
  }

  // - SEQ LOGGER ----------------------------------------------
  getSeqServerUrl(): string {
    return this.configService.get<string>('SEQ_SERVER_URL');
  }

  getSeqApiKey(): string {
    return this.configService.get<string>('SEQ_API_KEY');
  }

  // - OTP -----------------------------------------------------
  getOtpSmsExpirationTime(): number {
    return this.configService.get<number>('OTP_SMS_EXPIRATION_TIME');
  }

  getOtpEmailExpirationTime(): number {
    return this.configService.get<number>('OTP_EMAIL_EXPIRATION_TIME');
  }

  getOtpBlockingTime(): number {
    return this.configService.get<number>('OTP_BLOCKING_TIME') * 60;
  }

  getOtpMaxAllowedCount(): number {
    return this.configService.get<number>('OTP_MAX_ALLOWED_COUNT');
  }

  // ACTIVITY SETTINGS  -----------------------------------------
  getMaxDaysWithoutRegisteringActivity(): number {
    return this.configService.get<number>(
      'MAX_DAYS_WITHOUT_REGISTERING_ACTIVITY',
    );
  }

  // JWT -------------------------------------------------------
  getJwtTokenSecret(): string {
    return this.configService.get<string>('JWT_TOKEN_SECRET');
  }

  getJwtTokenExpirationTime(): string {
    return this.configService.get<string>('JWT_TOKEN_EXPIRATION_TIME');
  }

  getJwtRefreshTokenSecret(): string {
    return this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET');
  }

  getJwtRefreshTokenExpirationTime(): string {
    return this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION_TIME');
  }

  // DATABASE --------------------------------------------------
  getDatabaseUrl(): string {
    return this.configService.get<string>('DATABASE_URL');
  }

  getDatabaseSslCert(): string {
    return this.configService.get<string>('DATABASE_SSL_CERT');
  }

  getDatabaseSchema(): string {
    return this.configService.get<string>('DATABASE_SCHEMA');
  }

  getDatabaseSync(): boolean {
    return this.configService.get<boolean>('DATABASE_SYNCHRONIZE');
  }

  getDatabaseLogs(): boolean {
    return this.configService.get<boolean>('DATABASE_LOGS');
  }

  getDatabaseSlowQueryMaxTime(): number {
    return this.configService.get<number>('DATABASE_SLOW_QUERY_MAX_TIME');
  }

  // SMS -------------------------------------------------------
  getInnoveritApiUrl(): string {
    return this.configService.get<string>('SMS_INNOVERIT_API_URL');
  }

  getInnoveritApiKey(): string {
    return this.configService.get<string>('SMS_INNOVERIT_API_KEY');
  }

  // REDIS -----------------------------------------------------
  getRedisHost(): string {
    return this.configService.get<string>('REDIS_HOST');
  }

  getRedisPort(): number {
    return this.configService.get<number>('REDIS_PORT');
  }

  getRedisPass(): string {
    return this.configService.get<string>('REDIS_PASS');
  }

  // MAIL ------------------------------------------------------
  getSmtpAddress(): string {
    return this.configService.get<string>('SMTP_ADDRESS');
  }

  getSmtpPort(): number {
    return parseInt(this.configService.get<string>('SMTP_PORT'));
  }

  getSmtpAutentication(): string {
    return this.configService.get<string>('SMTP_AUTHENTICATION');
  }

  getSmtpEnableStartTls(): boolean {
    return (
      this.configService.get<string>('SMTP_ENABLE_STARTTLS_AUTO') === 'true'
    );
  }

  getSmtpUserName(): string {
    return this.configService.get<string>('SMTP_USER_NAME');
  }

  getSmtpPassword(): string {
    return this.configService.get<string>('SMTP_PASSWORD');
  }

  getSmtpFromAddress(): string {
    return this.configService.get<string>('SMTP_FROM_ADDRESS');
  }

  getSmtpFromUser(): string {
    return this.configService.get<string>('SMTP_FROM_USER');
  }

  getSmtpDebug(): boolean {
    return this.configService.get<boolean>('SMTP_DEBUG');
  }

  getSmtpLogger(): boolean {
    return this.configService.get<boolean>('SMTP_LOGGER');
  }

  // SENTRY
  getSentryDsn(): string {
    return this.configService.get<string>('SENTRY_DSN');
  }

  // SET JOB LIDER POD (Optional)
  isJobLider(): boolean {
    return this.configService.get<boolean>('JOB_LIDER');
  }
}
