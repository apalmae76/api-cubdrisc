export class SurveyQuestionPossibleAnswerCreateModel {
  surveyId: number;
  surveyQuestionId: number;
  answer: string;
  educationalTip: string;
  order?: number;
  active?: boolean;
}
export class SurveyQuestionPossibleAnswerUpdateModel {
  surveyId?: number;
  surveyQuestionId?: number;
  answer?: string;
  educationalTip?: string;
  order?: number;
  active?: boolean;
}

export class SurveyQuestionPossibleAnswerModel extends SurveyQuestionPossibleAnswerCreateModel {
  id: number;
  order: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
