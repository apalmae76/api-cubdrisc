import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsNumber, IsString } from 'class-validator';
import { SurveyRiskCalculationRulesModel } from 'src/domain/model/surveyRiskCalculationRules';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';

export class SurveyRiskCalculationPresenter {
  @ApiProperty({ type: 'integer' })
  @IsNumber()
  surveyId: number;

  @ApiProperty({ type: 'integer' })
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ type: 'integer' })
  @IsInt()
  minRange: number;

  @ApiProperty({ type: 'integer' })
  @IsInt()
  maxRange: number;

  @ApiProperty({ type: 'integer' })
  @IsInt()
  percent: number;

  @ApiProperty({ type: 'integer' })
  @IsInt()
  order: number;

  @ApiProperty()
  @IsDate()
  createdAt: Date;

  @ApiProperty()
  @IsDate()
  updatedAt: Date;

  @ApiProperty()
  @IsDate()
  deletedAt: Date;

  constructor(rule: SurveyRiskCalculationRulesModel) {
    this.surveyId = rule.surveyId;
    this.id = rule.id;
    this.description = rule.description;
    this.minRange = rule.minRange;
    this.maxRange = rule.maxRange;
    this.percent = rule.percent;
    this.order = rule.order;

    this.createdAt = rule.createdAt;
    this.updatedAt = rule.updatedAt;
    this.deletedAt = rule.deletedAt;
  }
}

export class GetSurveyRiskCalculationPresenter extends BaseResponsePresenter<SurveyRiskCalculationPresenter> {
  @ApiProperty({
    description: 'Survey risk calculation data',
    type: SurveyRiskCalculationPresenter,
  })
  @Type(() => SurveyRiskCalculationPresenter)
  data: SurveyRiskCalculationPresenter;
}
