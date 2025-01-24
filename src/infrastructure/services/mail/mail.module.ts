import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { EnvironmentConfigModule } from '../../config/environment-config/environment-config.module';
import { EnvironmentConfigService } from '../../config/environment-config/environment-config.service';
import { ApiLoggerModule } from '../logger/logger.module';
import { ApiLoggerService } from '../logger/logger.service';
import { getMailModuleOptions } from './mail.config';
import { EmailService } from './mail.service';

@Module({
  providers: [EmailService],
  imports: [
    MailerModule.forRootAsync({
      imports: [EnvironmentConfigModule, ApiLoggerModule],
      inject: [EnvironmentConfigService, ApiLoggerService],
      useFactory: getMailModuleOptions,
    }),
  ],
  exports: [EmailService],
})
export class MailModule {}
