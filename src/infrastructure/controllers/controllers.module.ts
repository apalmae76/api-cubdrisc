import { Module } from '@nestjs/common';
import { EnvironmentConfigModule } from '../config/environment-config/environment-config.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { ApiLoggerModule } from '../services/logger/logger.module';
import { EmailConsumerModule } from '../services/queue-consumers/email-consumer.module';
import { ApiRedisModule } from '../services/redis/redis.module';
import { UsecasesProxyModule } from '../usecases-proxy/usecases-proxy.module';
import { NomenclaturesController } from './nomenclatures/nomenclatures.controller';
import { ManagePatientController } from './patient/managePatientSurvey.controller';

@Module({
  imports: [
    EnvironmentConfigModule,
    ApiLoggerModule,
    UsecasesProxyModule.register(),
    EmailConsumerModule,
    RepositoriesModule,
    ApiRedisModule,
  ],
  controllers: [NomenclaturesController, ManagePatientController],
})
export class ControllersModule { }
