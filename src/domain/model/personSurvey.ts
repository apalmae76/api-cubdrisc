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
  totalScore?: number;
  waistPerimeter?: number;
  weight?: number;
  size?: number;
  imcc?: number;
  estimatedRisk?: number;
}

export class PersonSurveyModel extends PersonSurveyCreateModel {
  id: number;
  totalScore: number;
  waistPerimeter: number;
  weight: number;
  size: number;
  imcc: number;
  estimatedRisk: number;
  createdAt: Date;
  updatedAt: Date;
}
