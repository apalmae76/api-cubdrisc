export class SurveyRiskCalculationRulesCreateModel {
  surveyId: number;
  label: string;
  description: string;
  minRange: number;
  maxRange: number;
  percent: number;
}
export class SurveyRiskCalculationRulesUpdateModel {
  label?: string;
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
}
