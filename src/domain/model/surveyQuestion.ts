export class SurveyQuestionCreateModel {
  surveyId: number;
  question: string;
  order?: number;
  required?: boolean;
  gender?: string;
}
export class SurveyQuestionUpdateModel {
  surveyId?: number;
  question?: string;
  order?: number;
  required?: boolean;
  gender?: string;
}

export class SurveyQuestionModel extends SurveyQuestionCreateModel {
  id: number;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ListToUpdOrderModel {
  id: number;
  order: number;
}
