export class PatientSurveyAnswersCreateModel {
  patientId: number;
  surveyId: number;
  surveyQuestionId: number;
  surveyQuestionAnswerId: number;
}

export class PatientSurveyAnswersModel extends PatientSurveyAnswersCreateModel {
  createdAt?: Date;
}
