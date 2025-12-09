import { Module } from '@nestjs/common';
import { EnvironmentConfigModule } from 'src/infrastructure/config/environment-config/environment-config.module';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { IApiLogger } from '../logger/logger.interface';
import { API_LOGGER_KEY } from '../logger/logger.module';
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
        logger: IApiLogger,
      ) => {
        return new RedisAdapter(envCfgServ, logger);
      },
      inject: [EnvironmentConfigService, API_LOGGER_KEY],
    },
  ],
  exports: [WSService, 'REDIS_ADAPTER'],
  imports: [ApiRedisModule, EnvironmentConfigModule],
})
export class WSModule { }
