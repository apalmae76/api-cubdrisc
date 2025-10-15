import { DynamicModule, Module } from '@nestjs/common';
import { LoginUseCases } from '../../usecases/auth/login.usecases';
import { LogoutUseCases } from '../../usecases/auth/logout.usecases';

import { ExceptionsModule } from '../exceptions/exceptions.module';

import { RepositoriesModule } from '../repositories/repositories.module';
import { BcryptModule } from '../services/bcrypt/bcrypt.module';
import { BcryptService } from '../services/bcrypt/bcrypt.service';
import { JwtModule } from '../services/jwt/jwt.module';
import { JwtTokenService } from '../services/jwt/jwt.service';
import { MailModule } from '../services/mail/mail.module';
import { ApiRedisModule } from '../services/redis/redis.module';
import { ApiRedisService } from '../services/redis/redis.service';

import { DatabaseUserRepository } from '../repositories/user.repository';

import { GetGenericInfoUseCases } from 'src/usecases/admin/getGenericInfo.usecases';
import { ManageUsersRole } from 'src/usecases/admin/manageUsersRole.usecases';
import { TerritoriesUseCases } from 'src/usecases/territories/territories.usecases';
import { DataSource } from 'typeorm';
import { EnvironmentConfigModule } from '../config/environment-config/environment-config.module';
import { EnvironmentConfigService } from '../config/environment-config/environment-config.service';
import { DatabaseCityRepository } from '../repositories/city.repository';
import { DatabaseCountryRepository } from '../repositories/country.repository';
import { DatabaseEmailRepository } from '../repositories/email.repository';
import { DatabasePhoneRepository } from '../repositories/phone.repository';
import { DatabaseStateRepository } from '../repositories/state.repository';

import { CreateUserUseCases } from 'src/usecases/admin/createUser.usecases';
import { UpdateUserUseCases } from 'src/usecases/admin/updateUser.usecases';
import { UpdUserEmailWithOtpUseCases } from 'src/usecases/profile/updUserEmailWithOTP.usecases';
import { DatabaseOperatorsActionsRepository } from '../repositories/operatorsActions.repository';
import { DatabasePatientRepository } from '../repositories/patient.repository';
import { DatabasePatientSurveyRepository } from '../repositories/patientSurvey.repository';
import { DatabasePatientSurveyAnswersRepository } from '../repositories/patientSurveyAnswers.repository';
import { DatabasePersonRepository } from '../repositories/person.repository';
import { DatabaseSurveyRepository } from '../repositories/survey.repository';
import { DatabaseSurveyQuestionsRepository } from '../repositories/surveyQuestions.repository';
import { DatabaseSurveyQuestionsPossibleAnswersRepository } from '../repositories/surveyQuestionsPossibleAnswers.repository';
import { CronTasksModule } from '../services/cronjobs/cronTasks.module';
import { ApiLoggerModule } from '../services/logger/logger.module';
import { ApiLoggerService } from '../services/logger/logger.service';
import { WSModule } from '../services/websockets/ws.module';
import { UseCaseProxy } from './usecases-proxy';

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

        UsecasesProxyModule.GET_GENERIC,
      ],
    };
  }
}
