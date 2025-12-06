export class SurveyQuestionPossibleAnswerCreateModel {
  surveyId: number;
  surveyQuestionId: number;
  answer: string;
  educationalTip?: string | null;
  value: number;
  order?: number;
}
export class SurveyQuestionPossibleAnswerUpdateModel {
  surveyId?: number;
  surveyQuestionId?: number;
  answer?: string;
  educationalTip?: string | null;
  value?: number;
  order?: number;
}

export class SurveyQuestionPossibleAnswerModel extends SurveyQuestionPossibleAnswerCreateModel {
  id: number;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class SurveyQuestionPossibleAnswerStatusModel {
  surveyQuestionId: number;
  count: number;
  minValue: number;
  maxValue: number;
}
