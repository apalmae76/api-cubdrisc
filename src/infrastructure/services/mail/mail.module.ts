import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { EnvironmentConfigModule } from '../../config/environment-config/environment-config.module';
import { EnvironmentConfigService } from '../../config/environment-config/environment-config.service';
import { API_LOGGER_KEY } from '../logger/logger.module';
import { getMailModuleOptions } from './mail.config';
import { EmailService } from './mail.service';

@Module({
  providers: [EmailService],
  imports: [
    MailerModule.forRootAsync({
      imports: [EnvironmentConfigModule],
      inject: [EnvironmentConfigService, API_LOGGER_KEY],
      useFactory: getMailModuleOptions,
    }),
  ],
  exports: [EmailService],
})
export class MailModule { }
