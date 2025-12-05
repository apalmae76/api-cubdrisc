import { Module } from '@nestjs/common';
import { EnvironmentConfigModule } from '../config/environment-config/environment-config.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { CronTasksModule } from '../services/cronjobs/cron-tasks.module';
import { ApiLoggerModule } from '../services/logger/logger.module';
import { EmailConsumerModule } from '../services/queue-consumers/email-consumer.module';
import { ApiRedisModule } from '../services/redis/redis.module';
import { UsecasesProxyModule } from '../usecases-proxy/usecases-proxy.module';
import { AdminConfigSystemController } from './admin/admin-config-system.controller';
import { AdminUsersController } from './admin/adminUsers.controller';
import { ManagePatientsController } from './admin/manage-patient.controller';
import { AdminSurveysController } from './admin/manage-surveys.controller';
import { AuthController } from './auth/auth.controller';
import { NomenclaturesController } from './nomenclatures/nomenclatures.controller';

@Module({
  imports: [
    EnvironmentConfigModule,
    ApiLoggerModule,
    UsecasesProxyModule.register(),
    EmailConsumerModule,
    RepositoriesModule,
    ApiRedisModule,
    CronTasksModule,
  ],
  controllers: [
    AuthController,
    NomenclaturesController,
    AdminConfigSystemController,
    AdminUsersController,
    AdminSurveysController,
    ManagePatientsController,
  ],
})
export class AdminControllersModule { }
