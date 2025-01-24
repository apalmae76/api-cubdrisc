import { Module } from '@nestjs/common';
import { EnvironmentConfigModule } from 'src/infrastructure/config/environment-config/environment-config.module';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { ApiLoggerModule } from '../logger/logger.module';
import { ApiLoggerService } from '../logger/logger.service';
import { RedisAdapter } from '../websockets/redis-io.adapter';
import { ApiRedisService } from './redis.service';

@Module({
  providers: [
    ApiRedisService,
    {
      provide: 'REDIS_ADAPTER',
      useFactory: (
        envCfgServ: EnvironmentConfigService,
        logger: ApiLoggerService,
      ) => {
        return new RedisAdapter(envCfgServ, logger);
      },
      inject: [EnvironmentConfigService, ApiLoggerService],
    },
  ],
  imports: [EnvironmentConfigModule, ApiLoggerModule],
  exports: [ApiRedisService],
})
export class ApiRedisModule {}
