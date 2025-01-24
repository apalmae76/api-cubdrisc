import { Module } from '@nestjs/common';
import { EnvironmentConfigModule } from '../config/environment-config/environment-config.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { CronTasksModule } from '../services/cronjobs/cronTasks.module';
import { ApiLoggerModule } from '../services/logger/logger.module';
import { EmailConsumerModule } from '../services/queue-consumers/email-consumer.module';
import { ApiRedisModule } from '../services/redis/redis.module';
import { UsecasesProxyModule } from '../usecases-proxy/usecases-proxy.module';
import { AdminConfigSystemController } from './admin/adminConfigSystem.controller';
import { AdminUsersController } from './admin/adminUsers.controller';
import { AuthController } from './auth/auth.controller';
import { NomencladoresController } from './nomenclatures/nomenclatures.controller';

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
    NomencladoresController,
    AdminConfigSystemController,
    AdminUsersController,
  ],
})
export class AdminControllersModule {}
