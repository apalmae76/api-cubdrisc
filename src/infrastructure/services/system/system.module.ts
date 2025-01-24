import { Module } from '@nestjs/common';
import { ApiRedisModule } from '../redis/redis.module';
import { ApiLoggerModule } from '../logger/logger.module';
import { SystemService } from './system.service';

@Module({
  imports: [ApiRedisModule, ApiLoggerModule],
  providers: [SystemService],
})
export class SystemModule {}
