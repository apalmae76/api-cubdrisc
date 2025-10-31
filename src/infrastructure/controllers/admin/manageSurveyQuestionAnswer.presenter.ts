import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsNumber, IsString } from 'class-validator';
import { SurveyQuestionPossibleAnswerModel } from 'src/domain/model/surveyQuestionPossibleAnswers';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';

export class SurveyQuestionAnswerPresenter {
  @ApiProperty({ type: 'integer' })
  @IsNumber()
  surveyId: number;

  @ApiProperty({ type: 'integer' })
  @IsNumber()
  surveyQuestionId: number;

  @ApiProperty({ type: 'integer' })
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsString()
  answer: string;

  @ApiProperty()
  @IsString()
  educationalTip: string;

  @ApiProperty({ type: 'integer' })
  @IsInt()
  value: number;

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

  constructor(answer: SurveyQuestionPossibleAnswerModel) {
    this.id = answer.id;
    this.answer = answer.answer;
    this.educationalTip = answer.educationalTip;
    this.value = answer.value;
    this.order = answer.order;

    this.createdAt = answer.createdAt;
    this.updatedAt = answer.updatedAt;
    this.deletedAt = answer.deletedAt;
  }
}

export class GetSurveyQuestionAnswerPresenter extends BaseResponsePresenter<SurveyQuestionAnswerPresenter> {
  @ApiProperty({
    description: 'Survey question possible answer data',
    type: SurveyQuestionAnswerPresenter,
  })
  @Type(() => SurveyQuestionAnswerPresenter)
  data: SurveyQuestionAnswerPresenter;
}
