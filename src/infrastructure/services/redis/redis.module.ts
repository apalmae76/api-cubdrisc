import { Module } from '@nestjs/common';
import { EnvironmentConfigModule } from 'src/infrastructure/config/environment-config/environment-config.module';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { IApiLogger } from '../logger/logger.interface';
import { API_LOGGER_KEY } from '../logger/logger.module';
import { RedisAdapter } from '../websockets/redis-io.adapter';
import { ApiRedisService } from './redis.service';

@Module({
  providers: [
    ApiRedisService,
    {
      provide: 'REDIS_ADAPTER',
      useFactory: (
        envCfgServ: EnvironmentConfigService,
        logger: IApiLogger,
      ) => {
        return new RedisAdapter(envCfgServ, logger);
      },
      inject: [EnvironmentConfigService, API_LOGGER_KEY],
    },
  ],
  imports: [EnvironmentConfigModule],
  exports: [ApiRedisService],
})
export class ApiRedisModule { }
