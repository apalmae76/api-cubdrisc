export class PersonSurveyCreateModel {
  personId: number;
  surveyId: number;
  stateId: number;
  age: number;
  phone: string;
  email: string;
}

export class PersonSurveyUpdateModel {
  stateId?: number;
  age?: number;
  phone?: string;
  email?: string;
  weight?: number;
  size?: number;
  imcValue?: number;
  imcPoints?: number;
  imcCategory?: string;
  estimatedRisk?: string;
  totalScore?: number;
}

export class PersonSurveyModel extends PersonSurveyCreateModel {
  id: number;
  weight: number;
  size: number;
  imcValue: number;
  imcPoints: number;
  imcCategory: string;
  estimatedRisk: string;
  totalScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PersonSurveyFullModel extends PersonSurveyModel {
  surveyName: string;
  surveyDescription: string;
  ci: string;
  fullName: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  secondLastName?: string | null;
  dateOfBirth: Date;
  gender: string;

  estimatedRiskDescription: string;
  estimatedRiskPercent: number;
}
