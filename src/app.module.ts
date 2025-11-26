import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import {
  AcceptLanguageResolver,
  I18nModule,
  I18nService,
  I18nValidationPipe,
} from 'nestjs-i18n';
import * as path from 'path';
import { CustomI18nValidationExceptionFilter } from './infrastructure/common/filter/customI18nValidationExceptionFilter';
import { MyExceptionFilter } from './infrastructure/common/filter/myException.filter';
import { JwtStrategy } from './infrastructure/common/strategies/jwt.strategy';
import { JwtRefreshTokenStrategy } from './infrastructure/common/strategies/jwtRefresh.strategy';
import { EnvironmentConfigModule } from './infrastructure/config/environment-config/environment-config.module';
import { EnvironmentConfigService } from './infrastructure/config/environment-config/environment-config.service';
import { validationSchema } from './infrastructure/config/environment-config/environment-config.validation';
import { AdminControllersModule } from './infrastructure/controllers/admin.controllers.module';
import { ControllersModule } from './infrastructure/controllers/controllers.module';
import { ExceptionsModule } from './infrastructure/exceptions/exceptions.module';
import { RepositoriesModule } from './infrastructure/repositories/repositories.module';
import { BcryptModule } from './infrastructure/services/bcrypt/bcrypt.module';
import { JwtModule as JwtServiceModule } from './infrastructure/services/jwt/jwt.module';
import { ApiLoggerModule } from './infrastructure/services/logger/logger.module';
import { ApiLoggerService } from './infrastructure/services/logger/logger.service';
import { MailModule } from './infrastructure/services/mail/mail.module';
import { PdfGeneratorModule } from './infrastructure/services/pdf-generator/pdf-generator.module';
import { getRedisConfForBull } from './infrastructure/services/redis/redis.config';
import { ApiRedisModule } from './infrastructure/services/redis/redis.module';
import { SystemModule } from './infrastructure/services/system/system.module';
import { WSModule } from './infrastructure/services/websockets/ws.module';
import { UsecasesProxyModule } from './infrastructure/usecases-proxy/usecases-proxy.module';

@Module({
  imports: [
    I18nModule.forRootAsync({
      useFactory: (appConfig: EnvironmentConfigService) => ({
        fallbackLanguage: 'en',
        loaderOptions: {
          path: path.join(__dirname, '/i18n/'),
          watch: appConfig.isNotProductionEnv(),
        },
      }),
      inject: [EnvironmentConfigService],
      imports: [EnvironmentConfigModule],
      resolvers: [AcceptLanguageResolver],
    }),
    SystemModule,
    ApiLoggerModule,
    ScheduleModule.forRoot(),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_TOKEN_SECRET,
    }),
    ExceptionsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
    EnvironmentConfigModule,
    WSModule,
    ApiRedisModule,
    MailModule,
    BcryptModule,
    JwtServiceModule,
    BullModule.forRootAsync({
      imports: [EnvironmentConfigModule],
      inject: [EnvironmentConfigService],
      useFactory: (appConfig: EnvironmentConfigService) =>
        getRedisConfForBull(appConfig),
    }),
    UsecasesProxyModule.register(),
    ControllersModule,
    AdminControllersModule,
    RepositoriesModule,
    PdfGeneratorModule,
  ],
  providers: [
    JwtStrategy,
    JwtRefreshTokenStrategy,
    CustomI18nValidationExceptionFilter,
    {
      provide: APP_FILTER,
      useFactory: (
        logger: ApiLoggerService,
        i18nService: I18nService,
        appConfig: EnvironmentConfigService,
      ) => {
        const isNotProductionEnv = appConfig.isNotProductionEnv();
        return new MyExceptionFilter(logger, isNotProductionEnv, i18nService);
      },
      inject: [ApiLoggerService, I18nService, EnvironmentConfigService],
    },
    {
      provide: APP_PIPE,
      useFactory: () => {
        return new I18nValidationPipe({
          skipMissingProperties: true,
          transform: true,
          whitelist: true,
        });
      },
    },
  ],
})
export class AppModule { }
