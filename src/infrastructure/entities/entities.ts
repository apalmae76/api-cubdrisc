import { UserEmails } from './emails.entity';
import { MedicalSpecialty } from './medical-specialty.entity';
import { OperatorsActions } from './operators-actions.entity';
import { Patient } from './patient.entity';
import { PersonSurveyAnswers } from './person-survey-answers.entity';
import { Person } from './person.entity';
import { PersonSurvey } from './personSurvey.entity';
import { UserPhones } from './phone.entity';
import { State } from './state.entity';
import { SurveyQuestionsPossibleAnswers } from './survey-questions-possible-answers.entity';
import { SurveyQuestions } from './survey-questions.entity';
import { SurveyRiskCalculationRules } from './survey-rules-for-risk-calculation.entity';
import { Survey } from './survey.entity';
import { User } from './user.entity';

export const ENTITIES = [
  Person,
  User,
  Patient,
  UserPhones,
  UserEmails,
  MedicalSpecialty,
  OperatorsActions,
  State,

  Survey,
  SurveyRiskCalculationRules,
  SurveyQuestions,
  SurveyQuestionsPossibleAnswers,
  PersonSurvey,
  PersonSurveyAnswers,
];
