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

/*
export class UsecasesProxyModule22 {
  // Auth
  static LOGIN = LoginUseCases.name;
  static LOGOUT = LogoutUseCases.name;
  // Perfil
  static CREATE_USER = CreateUserUseCases.name;
  static UPDATE_USER = UpdateUserUseCases.name;
  static USER_EMAIL = UpdUserEmailWithOtpUseCases.name;

  // Nomenclatures
  static GET_TERRITORIES = TerritoriesUseCases.name;

  // Admin
  static MANAGE_USER_ROLE = ManageUsersRole.name;
  static MANAGE_SURVEY = ManageSurveyUseCases.name;

  static GET_GENERIC = GetGenericInfoUseCases.name;

  static register(): DynamicModule {
    return {
      module: UsecasesProxyModule,
      providers: [
        // Territories -------------------------------------------------------------
        // GET_TERRITORIES
        {
          inject: [
            DatabaseCountryRepository,
            DatabaseStateRepository,
            DatabaseCityRepository,
            ApiLoggerService,
          ],
          provide: UsecasesProxyModule.GET_TERRITORIES,
          useFactory: (
            countryRepo: DatabaseCountryRepository,
            stateRepo: DatabaseStateRepository,
            cityRepo: DatabaseCityRepository,
            logger: ApiLoggerService,
          ) =>
            new UseCaseProxy(
              new TerritoriesUseCases(countryRepo, stateRepo, cityRepo, logger),
            ),
        },
        // Auth -------------------------------------------------------------
        // LOGIN
        {
          inject: [
            JwtTokenService,
            EnvironmentConfigService,
            ApiRedisService,
            DatabaseUserRepository,
            BcryptService,
            DataSource,
            ApiLoggerService,
          ],
          provide: UsecasesProxyModule.LOGIN,
          useFactory: (
            jwtTokenService: JwtTokenService,
            appConfig: EnvironmentConfigService,
            redisService: ApiRedisService,
            userRepo: DatabaseUserRepository,
            bcryptService: BcryptService,
            dataSource: DataSource,
            logger: ApiLoggerService,
          ) =>
            new UseCaseProxy(
              new LoginUseCases(
                jwtTokenService,
                appConfig,
                redisService,
                userRepo,
                bcryptService,
                dataSource,
                logger,
              ),
            ),
        },
        // LOGOUT
        {
          inject: [DatabaseUserRepository, DataSource, ApiLoggerService],
          provide: UsecasesProxyModule.LOGOUT,
          useFactory: (
            userRepo: DatabaseUserRepository,
            dataSource: DataSource,
            logger: ApiLoggerService,
          ) =>
            new UseCaseProxy(new LogoutUseCases(userRepo, dataSource, logger)),
        },
        // Perfil -------------------------------------------------------------
        // UPDATE_USER
        {
          inject: [DatabaseUserRepository, DataSource, ApiLoggerService],
          provide: UsecasesProxyModule.UPDATE_USER,
          useFactory: (
            userRepo: DatabaseUserRepository,
            dataSource: DataSource,
            logger: ApiLoggerService,
          ) =>
            new UseCaseProxy(
              new UpdateUserUseCases(userRepo, dataSource, logger),
            ),
        },
        // CREATE_USER
        {
          inject: [DatabaseUserRepository, DataSource, ApiLoggerService],
          provide: UsecasesProxyModule.CREATE_USER,
          useFactory: (
            userRepo: DatabaseUserRepository,
            dataSource: DataSource,
            logger: ApiLoggerService,
          ) =>
            new UseCaseProxy(
              new CreateUserUseCases(userRepo, dataSource, logger),
            ),
        },
        // USER_EMAIL
        {
          inject: [
            DatabaseUserRepository,
            DatabaseEmailRepository,
            DataSource,
            EnvironmentConfigService,
            BcryptService,
            JwtTokenService,
            ApiRedisService,
            ApiLoggerService,
          ],
          provide: UsecasesProxyModule.USER_EMAIL,
          useFactory: (
            userRepo: DatabaseUserRepository,
            emailRepo: DatabaseEmailRepository,
            dataSource: DataSource,
            appConfig: EnvironmentConfigService,
            bcryptService: BcryptService,
            jwtTokenService: JwtTokenService,
            redisService: ApiRedisService,
            logger: ApiLoggerService,
          ) =>
            new UseCaseProxy(
              new UpdUserEmailWithOtpUseCases(
                userRepo,
                emailRepo,
                dataSource,
                appConfig,
                bcryptService,
                jwtTokenService,
                redisService,
                logger,
              ),
            ),
        },
        // Admin -------------------------------------------------------------
        // MANAGE_USER_ROLE
        {
          inject: [
            DatabaseUserRepository,
            DatabaseOperatorsActionsRepository,
            DataSource,
            ApiLoggerService,
          ],
          provide: UsecasesProxyModule.MANAGE_USER_ROLE,
          useFactory: (
            userRepo: DatabaseUserRepository,
            operActionRepo: DatabaseOperatorsActionsRepository,
            dataSource: DataSource,
            logger: ApiLoggerService,
          ) =>
            new UseCaseProxy(
              new ManageUsersRole(userRepo, operActionRepo, dataSource, logger),
            ),
        },
        // MANAGE SURVEY
        {
          inject: [
            DatabaseSurveyRepository,
            DatabaseOperatorsActionsRepository,
            EnvironmentConfigService,
            DataSource,
            ApiLoggerService,
          ],
          provide: UsecasesProxyModule.MANAGE_SURVEY,
          useFactory: (
            surveyRepo: DatabaseSurveyRepository,
            operActionRepo: DatabaseOperatorsActionsRepository,
            appConfig: EnvironmentConfigService,
            dataSource: DataSource,
            logger: ApiLoggerService,
          ) =>
            new UseCaseProxy(
              new ManageSurveyUseCases(
                surveyRepo,
                operActionRepo,
                appConfig,
                dataSource,
                logger,
              ),
            ),
        },

        // GET_GENERIC
        {
          inject: [
            DatabasePersonRepository,
            DatabaseUserRepository,
            DatabasePatientRepository,
            DatabasePhoneRepository,
            DatabaseEmailRepository,
            DatabaseSurveyRepository,
            DatabaseSurveyQuestionsRepository,
            DatabaseSurveyQuestionsPossibleAnswersRepository,
            DatabasePatientSurveyRepository,
            DatabasePatientSurveyAnswersRepository,
            ApiLoggerService,
          ],
          provide: UsecasesProxyModule.GET_GENERIC,
          useFactory: (
            personRepo: DatabasePersonRepository,
            userRepo: DatabaseUserRepository,
            patientRepo: DatabasePatientRepository,
            userPhoneRepo: DatabasePhoneRepository,
            userEmailsRepo: DatabaseEmailRepository,
            surveysRepo: DatabaseSurveyRepository,
            surveysQuestionsRepo: DatabaseSurveyQuestionsRepository,
            surveysQuestionsPARepo: DatabaseSurveyQuestionsPossibleAnswersRepository,
            patientSurveyRepo: DatabasePatientSurveyRepository,
            patientSARepo: DatabasePatientSurveyAnswersRepository,
            logger: ApiLoggerService,
          ) =>
            new UseCaseProxy(
              new GetGenericInfoUseCases(
                personRepo,
                userRepo,
                patientRepo,
                userPhoneRepo,
                userEmailsRepo,
                surveysRepo,
                surveysQuestionsRepo,
                surveysQuestionsPARepo,
                patientSurveyRepo,
                patientSARepo,
                logger,
              ),
            ),
        },
      ],
      exports: [
        // Login
        UsecasesProxyModule.LOGIN,
        UsecasesProxyModule.LOGOUT,
        // Profile
        UsecasesProxyModule.UPDATE_USER,
        UsecasesProxyModule.CREATE_USER,
        UsecasesProxyModule.USER_EMAIL,
        // Territories
        UsecasesProxyModule.GET_TERRITORIES,
        // Admin
        UsecasesProxyModule.MANAGE_USER_ROLE,
        UsecasesProxyModule.MANAGE_SURVEY,

        UsecasesProxyModule.GET_GENERIC,
      ],
    };
  }
}
*/
