export class SurveyQuestionCreateModel {
  surveyId: number;
  question: string;
  order?: number;
  required?: boolean;
  active?: boolean;
}
export class SurveyQuestionUpdateModel {
  surveyId?: number;
  question?: string;
  order?: number;
  required?: boolean;
  active?: boolean;
}

export class SurveyQuestionModel extends SurveyQuestionCreateModel {
  id: number;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export class ListToUpdOrderModel {
  id: number;
  order: number;
}
