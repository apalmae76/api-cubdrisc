import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiLoggerModule } from 'src/infrastructure/services/logger/logger.module';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { EnvironmentConfigModule } from '../environment-config/environment-config.module';
import { EnvironmentConfigService } from '../environment-config/environment-config.service';
import { getTypeOrmModuleOptions } from './typeorm.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [EnvironmentConfigModule, ApiLoggerModule],
      inject: [EnvironmentConfigService, ApiLoggerService],
      useFactory: getTypeOrmModuleOptions,
    }),
  ],
})
export class TypeOrmConfigModule {}
