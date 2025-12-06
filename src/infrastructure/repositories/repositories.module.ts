import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvironmentConfigModule } from '../config/environment-config/environment-config.module';
import { TypeOrmConfigModule } from '../config/typeorm/typeorm.module';
import { UserEmails } from '../entities/emails.entity';
import { MedicalSpecialty } from '../entities/medical-specialty.entity';
import { OperatorsActions } from '../entities/operators-actions.entity';
import { Patient } from '../entities/patient.entity';
import { PersonSurveyAnswers } from '../entities/person-survey-answers.entity';
import { Person } from '../entities/person.entity';
import { PersonSurvey } from '../entities/personSurvey.entity';
import { UserPhones } from '../entities/phone.entity';
import { State } from '../entities/state.entity';
import { SurveyQuestionsPossibleAnswers } from '../entities/survey-questions-possible-answers.entity';
import { SurveyQuestions } from '../entities/survey-questions.entity';
import { SurveyRiskCalculationRules } from '../entities/survey-rules-for-risk-calculation.entity';
import { Survey } from '../entities/survey.entity';
import { User } from '../entities/user.entity';
import { ApiLoggerModule } from '../services/logger/logger.module';
import { ApiRedisModule } from '../services/redis/redis.module';
import { WSModule } from '../services/websockets/ws.module';
import { DatabaseEmailRepository } from './email.repository';
import { DatabaseMedicalSpecialtyRepository } from './medical-specialty.repository';
import { DatabaseOperatorsActionsRepository } from './operators-actions.repository';
import { DatabasePatientRepository } from './patient.repository';
import { DatabasePersonSurveyAnswersRepository } from './person-survey-answers.repository';
import { DatabasePersonSurveyRepository } from './person-survey.repository';
import { DatabasePersonRepository } from './person.repository';
import { DatabasePhoneRepository } from './phone.repository';
import { DatabaseStateRepository } from './state.repository';
import { DatabaseSurveyQuestionsPossibleAnswersRepository } from './survey-questions-possible-answers.repository';
import { DatabaseSurveyQuestionsRepository } from './survey-questions.repository';
import { DatabaseSurveyRiskCalculationRulesRepository } from './survey-risk-calculation-rules.repository';
import { DatabaseSurveyRepository } from './survey.repository';
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

      PersonSurvey,
      PersonSurveyAnswers,
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

    DatabasePersonSurveyRepository,
    DatabasePersonSurveyAnswersRepository,
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

    DatabasePersonSurveyRepository,
    DatabasePersonSurveyAnswersRepository,
  ],
})
export class RepositoriesModule { }
