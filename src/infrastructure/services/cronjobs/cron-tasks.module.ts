import { Module } from '@nestjs/common';
import { EnvironmentConfigModule } from 'src/infrastructure/config/environment-config/environment-config.module';
import { RepositoriesModule } from 'src/infrastructure/repositories/repositories.module';
import { ApiRedisModule } from '../redis/redis.module';

import { CronTasksService } from './cron-tasks.service';

@Module({
  providers: [CronTasksService],
  imports: [RepositoriesModule, ApiRedisModule, EnvironmentConfigModule],
  exports: [CronTasksService],
})
export class CronTasksModule { }
