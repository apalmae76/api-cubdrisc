import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsNumber, IsString } from 'class-validator';
import { SurveyModel } from 'src/domain/model/survey';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';

export class SurveyPresenter {
  @ApiProperty()
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsBoolean()
  calcRisk: boolean;

  @ApiProperty()
  @IsBoolean()
  active: boolean;

  @ApiProperty()
  @IsDate()
  createdAt: Date;

  @ApiProperty()
  @IsDate()
  updatedAt: Date;

  @ApiProperty()
  @IsDate()
  deletedAt: Date;

  constructor(survey: SurveyModel) {
    this.id = survey.id;
    this.name = survey.name;
    this.description = survey.description;
    this.calcRisk = survey.calcRisks;
    this.active = survey.active;

    this.createdAt = survey.createdAt;
    this.updatedAt = survey.updatedAt;
    this.deletedAt = survey.deletedAt;
  }
}

export class GetSurveyPresenter extends BaseResponsePresenter<SurveyPresenter> {
  @ApiProperty({
    description: 'Survey data',
    type: SurveyPresenter,
  })
  @Type(() => SurveyPresenter)
  data: SurveyPresenter;
}
