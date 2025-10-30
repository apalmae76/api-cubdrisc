import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvironmentConfigModule } from '../config/environment-config/environment-config.module';
import { TypeOrmConfigModule } from '../config/typeorm/typeorm.module';
import { UserEmails } from '../entities/emails.entity';
import { MedicalSpecialty } from '../entities/medicalSpecialty.entity';
import { OperatorsActions } from '../entities/operatorsActions.entity';
import { Patient } from '../entities/patient.entity';
import { PatientSurvey } from '../entities/patientSurvey.entity';
import { PatientSurveyAnswers } from '../entities/patientSurveyAnswers.entity';
import { Person } from '../entities/person.entity';
import { UserPhones } from '../entities/phone.entity';
import { State } from '../entities/state.entity';
import { Survey } from '../entities/survey.entity';
import { SurveyQuestions } from '../entities/surveyQuestions.entity';
import { SurveyQuestionsPossibleAnswers } from '../entities/surveyQuestionsPossibleAnswers.entity';
import { SurveyRiskCalculationRules } from '../entities/surveyRulesForRiskCalculation.entity';
import { User } from '../entities/user.entity';
import { ApiLoggerModule } from '../services/logger/logger.module';
import { ApiRedisModule } from '../services/redis/redis.module';
import { WSModule } from '../services/websockets/ws.module';
import { DatabaseEmailRepository } from './email.repository';
import { DatabaseMedicalSpecialtyRepository } from './medicalSpecialty.repository';
import { DatabaseOperatorsActionsRepository } from './operatorsActions.repository';
import { DatabasePatientRepository } from './patient.repository';
import { DatabasePatientSurveyRepository } from './patientSurvey.repository';
import { DatabasePatientSurveyAnswersRepository } from './patientSurveyAnswers.repository';
import { DatabasePersonRepository } from './person.repository';
import { DatabasePhoneRepository } from './phone.repository';
import { DatabaseStateRepository } from './state.repository';
import { DatabaseSurveyRepository } from './survey.repository';
import { DatabaseSurveyQuestionsRepository } from './surveyQuestions.repository';
import { DatabaseSurveyQuestionsPossibleAnswersRepository } from './surveyQuestionsPossibleAnswers.repository';
import { DatabaseSurveyRiskCalculationRulesRepository } from './surveyRiskCalculationRules.repository';
import { DatabaseUserRepository } from './user.repository';

@Module({
  imports: [
    EnvironmentConfigModule,
    TypeOrmConfigModule,
    ApiLoggerModule,
    ApiRedisModule,
    WSModule,
    TypeOrmModule.forFeature([
      Person,
      User,
      Patient,
      UserEmails,
      UserPhones,
      OperatorsActions,
      State,
      MedicalSpecialty,

      Survey,
      SurveyRiskCalculationRules,
      SurveyQuestions,
      SurveyQuestionsPossibleAnswers,
      PatientSurvey,
      PatientSurveyAnswers,
    ]),
  ],
  providers: [
    DatabasePersonRepository,
    DatabaseUserRepository,
    DatabasePatientRepository,
    DatabaseEmailRepository,
    DatabasePhoneRepository,
    DatabaseStateRepository,
    DatabaseMedicalSpecialtyRepository,
    DatabaseOperatorsActionsRepository,

    DatabaseSurveyRepository,
    DatabaseSurveyRiskCalculationRulesRepository,
    DatabaseSurveyQuestionsRepository,
    DatabaseSurveyQuestionsPossibleAnswersRepository,

    DatabasePatientSurveyRepository,
    DatabasePatientSurveyAnswersRepository,
  ],
  exports: [
    DatabasePersonRepository,
    DatabaseUserRepository,
    DatabasePatientRepository,
    DatabaseEmailRepository,
    DatabasePhoneRepository,
    DatabaseStateRepository,
    DatabaseMedicalSpecialtyRepository,
    DatabaseOperatorsActionsRepository,

    DatabaseSurveyRepository,
    DatabaseSurveyRiskCalculationRulesRepository,
    DatabaseSurveyQuestionsRepository,
    DatabaseSurveyQuestionsPossibleAnswersRepository,

    DatabasePatientSurveyRepository,
    DatabasePatientSurveyAnswersRepository,
  ],
})
export class RepositoriesModule { }
