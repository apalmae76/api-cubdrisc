export class SurveyRiskCalculationRulesCreateModel {
  surveyId: number;
  description: string;
  minRange: number;
  maxRange: number;
  percent: number;
}
export class SurveyRiskCalculationRulesUpdateModel {
  description?: string;
  minRange?: number;
  maxRange?: number;
  percent?: number;
}

export class SurveyRiskCalculationRulesModel extends SurveyRiskCalculationRulesCreateModel {
  id: number;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}
