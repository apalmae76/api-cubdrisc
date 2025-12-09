import { Module } from '@nestjs/common';
import { EnvironmentConfigModule } from 'src/infrastructure/config/environment-config/environment-config.module';
import { ContextModule } from '../../context/context.module';
import { ConsoleLoggerService } from './console-logger.service';

@Module({
  imports: [EnvironmentConfigModule, ContextModule],
  providers: [ConsoleLoggerService],
  exports: [ConsoleLoggerService],
})
export class ConsoleLoggerModule { }
