import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsInt, IsNumber, IsString } from 'class-validator';
import { SurveyQuestionModel } from 'src/domain/model/surveyQuestion';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';

export class SurveyQuestionPresenter {
  @ApiProperty({ type: 'integer' })
  @IsNumber()
  surveyId: number;

  @ApiProperty({ type: 'integer' })
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsString()
  question: string;

  @ApiProperty({ type: 'integer' })
  @IsInt()
  order: number;

  @ApiProperty()
  @IsBoolean()
  required: boolean;

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

  constructor(survey: SurveyQuestionModel) {
    this.surveyId = survey.surveyId;
    this.id = survey.id;
    this.question = survey.question;
    this.order = survey.order;
    this.required = survey.required;
    this.active = survey.active;

    this.createdAt = survey.createdAt;
    this.updatedAt = survey.updatedAt;
    this.deletedAt = survey.deletedAt;
  }
}

export class GetSurveyQuestionPresenter extends BaseResponsePresenter<SurveyQuestionPresenter> {
  @ApiProperty({
    description: 'Survey question data',
    type: SurveyQuestionPresenter,
  })
  @Type(() => SurveyQuestionPresenter)
  data: SurveyQuestionPresenter;
}
