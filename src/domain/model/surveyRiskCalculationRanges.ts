export class SurveyRiskCalculationRangesCreateModel {
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
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
