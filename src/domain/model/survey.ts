export class SurveyCreateModel {
  name: string;
  description: string;
  showTips: boolean;
  calcRisks: boolean;
  active: boolean;
}
export class SurveyUpdateModel {
  name?: string;
  description?: string;
  showTips?: boolean;
  calcRisks?: boolean;
  active?: boolean;
}

export class SurveyModel extends SurveyCreateModel {
  id: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
