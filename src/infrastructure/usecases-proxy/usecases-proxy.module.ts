import {
  DynamicModule,
  InjectionToken,
  Module,
  Provider,
} from '@nestjs/common';

import { ExceptionsModule } from '../exceptions/exceptions.module';

import { RepositoriesModule } from '../repositories/repositories.module';
import { BcryptModule } from '../services/bcrypt/bcrypt.module';
import { JwtModule } from '../services/jwt/jwt.module';
import { MailModule } from '../services/mail/mail.module';
import { ApiRedisModule } from '../services/redis/redis.module';

import { EnvironmentConfigModule } from '../config/environment-config/environment-config.module';

import { CronTasksModule } from '../services/cronjobs/cron-tasks.module';
import { ApiLoggerModule } from '../services/logger/logger.module';
import { PdfGeneratorModule } from '../services/pdf-generator/pdf-generator.module';
import { WSModule } from '../services/websockets/ws.module';
import { IUseCaseProviderData } from './plugin/interface/use-case-provider.interface';
import { loadProxyModuleMeta } from './plugin/use-case.utils';

@Module({
  imports: [
    JwtModule,
    BcryptModule,
    WSModule,
    ApiLoggerModule,
    ApiRedisModule,
    MailModule,
    EnvironmentConfigModule,
    RepositoriesModule,
    ExceptionsModule,
    CronTasksModule,
    PdfGeneratorModule,
  ],
})
export class UsecasesProxyModule {
  static loadProviders() {
    const providersMap = new Map<InjectionToken, Provider>();
    const { meta } = loadProxyModuleMeta();
    const metaArray: IUseCaseProviderData[] = meta;
    metaArray.forEach((meta) => {
      providersMap.set(meta.token, {
        inject: meta.dependencies,
        provide: meta.token,
        useFactory: meta.factory,
      });
    });
    return {
      providers: Array.from(providersMap.values()),
      exports: Array.from(providersMap.keys()),
    };
  }

  static register(): DynamicModule {
    const { providers, exports } = this.loadProviders();
    return {
      module: UsecasesProxyModule,
      providers,
      exports,
    };
  }
}
