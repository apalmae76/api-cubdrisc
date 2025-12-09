import { Module } from '@nestjs/common';
import * as IORedis from 'ioredis';
import { EnvironmentConfigModule } from 'src/infrastructure/config/environment-config/environment-config.module';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { getRedisConfForIoAdapter } from './redis.config';
import { ApiRedisService } from './redis.service';

export const REDIS_SERVICE_KEY = Symbol('REDIS_SERVICE_KEY');

@Module({
  imports: [EnvironmentConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: EnvironmentConfigService) => {
        const options = getRedisConfForIoAdapter(configService);
        return new IORedis.Redis(options);
      },
      inject: [EnvironmentConfigService],
    },
    {
      provide: REDIS_SERVICE_KEY,
      useClass: ApiRedisService,
    },
    ApiRedisService,
  ],
  exports: [ApiRedisService, REDIS_SERVICE_KEY],
})
export class ApiRedisModule { }
