import { Module } from '@nestjs/common';
import { ApiRedisModule } from '../redis/redis.module';
import { SystemService } from './system.service';

@Module({
  imports: [ApiRedisModule],
  providers: [SystemService],
})
export class SystemModule { }
