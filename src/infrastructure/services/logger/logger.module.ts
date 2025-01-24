import { SeqLoggerModule } from '@jasonsoft/nestjs-seq';
import { Module } from '@nestjs/common';
import { EnvironmentConfigModule } from 'src/infrastructure/config/environment-config/environment-config.module';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { ContextModule } from '../context/context.module';
import { ApiLoggerService } from './logger.service';

@Module({
  providers: [ApiLoggerService],
  imports: [
    SeqLoggerModule.forRootAsync({
      imports: [EnvironmentConfigModule, ContextModule],
      useFactory: async (appConfig: EnvironmentConfigService) => ({
        level: appConfig.getLogLevel(),
        serviceName: null,
        serverUrl: appConfig.getSeqServerUrl(),
        apiKey: appConfig.getSeqApiKey(),
      }),
      inject: [EnvironmentConfigService],
    }),
    EnvironmentConfigModule,
  ],
  exports: [ApiLoggerService],
})
export class ApiLoggerModule {}
