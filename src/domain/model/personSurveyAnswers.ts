export class PersonSurveyAnswersCreateModel {
  personId: number;
  surveyId: number;
  personSurveyId: number;
  surveyQuestionId: number;
  surveyQuestionAnswerId: number;
}

export class PersonSurveyAnswersModel extends PersonSurveyAnswersCreateModel {
  createdAt?: Date;
}
