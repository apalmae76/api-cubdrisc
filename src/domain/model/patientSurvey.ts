export class PatientSurveyCreateModel {
  patientId: number;
  surveyId: number;
  age: number;
  totalScore: number;
  waistPerimeter: number;
  weight: number;
  size: number;
  imcc: number;
  estimatedRisk: number;
}

export class PatientSurveyModel extends PatientSurveyCreateModel {
  createdAt?: Date;
}
