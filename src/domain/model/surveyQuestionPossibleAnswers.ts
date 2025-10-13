export class SurveyQuestionPossibleAnswerCreateModel {
  surveyId: number;
  surveyQuestionId: number;
  answer: string;
  educationalTip: string;
  order: number;
}
export class SurveyQuestionPossibleAnswerUpdateModel {
  surveyId?: number;
  surveyQuestionId?: number;
  answer?: string;
  educationalTip?: string;
  order?: number;
}

export class SurveyQuestionPossibleAnswerModel extends SurveyQuestionPossibleAnswerCreateModel {
  id: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
