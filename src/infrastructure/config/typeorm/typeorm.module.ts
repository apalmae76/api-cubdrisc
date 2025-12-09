import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { API_LOGGER_KEY } from 'src/infrastructure/services/logger/logger.module';
import { EnvironmentConfigModule } from '../environment-config/environment-config.module';
import { EnvironmentConfigService } from '../environment-config/environment-config.service';
import { getTypeOrmModuleOptions } from './typeorm.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [EnvironmentConfigModule],
      inject: [EnvironmentConfigService, API_LOGGER_KEY],
      useFactory: getTypeOrmModuleOptions,
    }),
  ],
})
export class TypeOrmConfigModule { }
