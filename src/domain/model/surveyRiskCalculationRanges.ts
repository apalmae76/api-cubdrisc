export class SurveyRiskCalculationRangesCreateModel {
  surveyId: number;
  description: string;
  minRange: number;
  maxRange: number;
}
export class SurveyRiskCalculationRangesUpdateModel {
  description?: string;
  minRange?: number;
  maxRange?: number;
}

export class SurveyRiskCalculationRangesModel extends SurveyRiskCalculationRangesCreateModel {
  id: number;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}
