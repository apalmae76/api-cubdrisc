export class SurveyCreateModel {
  name: string;
  description: string;
  calcRisks: boolean;
}
export class SurveyUpdateModel {
  name?: string;
  description?: string;
  calcRisks?: boolean;
  active?: boolean;
}

export class SurveyModel extends SurveyCreateModel {
  id: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
