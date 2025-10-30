import { UserEmails } from './emails.entity';
import { MedicalSpecialty } from './medicalSpecialty.entity';
import { OperatorsActions } from './operatorsActions.entity';
import { Patient } from './patient.entity';
import { PatientSurvey } from './patientSurvey.entity';
import { PatientSurveyAnswers } from './patientSurveyAnswers.entity';
import { Person } from './person.entity';
import { UserPhones } from './phone.entity';
import { State } from './state.entity';
import { Survey } from './survey.entity';
import { SurveyQuestions } from './surveyQuestions.entity';
import { SurveyQuestionsPossibleAnswers } from './surveyQuestionsPossibleAnswers.entity';
import { SurveyRiskCalculationRules } from './surveyRulesForRiskCalculation.entity';
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
  PatientSurvey,
  PatientSurveyAnswers,
];
