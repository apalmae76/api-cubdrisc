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
  estimatedRisk?: number;
  totalScore?: number;
}

export class PersonSurveyModel extends PersonSurveyCreateModel {
  id: number;
  weight: number;
  size: number;
  imcValue: number;
  imcPoints: number;
  imcCategory: string;
  estimatedRisk: number;
  totalScore: number;
  createdAt: Date;
  updatedAt: Date;
}
