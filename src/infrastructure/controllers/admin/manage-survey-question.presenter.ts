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
  @IsString()
  gender: string;

  @ApiProperty()
  @IsDate()
  createdAt: Date;

  @ApiProperty()
  @IsDate()
  updatedAt: Date;

  constructor(question: SurveyQuestionModel) {
    this.surveyId = question.surveyId;
    this.id = question.id;
    this.question = question.question;
    this.order = question.order;
    this.required = question.required;
    this.gender = question.gender;

    this.createdAt = question.createdAt;
    this.updatedAt = question.updatedAt;
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
