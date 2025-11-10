export class SurveyCreateModel {
  name: string;
  description: string;
}
export class SurveyUpdateModel {
  name?: string;
  description?: string;
  active?: boolean;
}

export class SurveyModel extends SurveyCreateModel {
  id: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
