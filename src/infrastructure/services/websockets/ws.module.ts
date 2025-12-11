import { Module } from '@nestjs/common';
import { EnvironmentConfigModule } from 'src/infrastructure/config/environment-config/environment-config.module';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { ApiLoggerModule } from '../logger/logger.module';
import { ApiLoggerService } from '../logger/logger.service';
import { ApiRedisModule } from '../redis/redis.module';
import { RedisAdapter } from './redis-io.adapter';
import { WSService } from './ws.service';

@Module({
  providers: [
    WSService,
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
  exports: [WSService, 'REDIS_ADAPTER'],
  imports: [ApiRedisModule, ApiLoggerModule, EnvironmentConfigModule],
})
export class WSModule {}
