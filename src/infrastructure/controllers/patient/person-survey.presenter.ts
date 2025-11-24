import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsUUID } from 'class-validator';
import { BaseResponsePresenter } from 'src/infrastructure/common/dtos/baseResponse.dto';

import { IsDate, IsString } from 'class-validator';
import { SurveyModel } from 'src/domain/model/survey';
import { SurveyQuestionModel } from 'src/domain/model/surveyQuestion';
import { SurveyQuestionPossibleAnswerModel } from 'src/domain/model/surveyQuestionPossibleAnswers';

export class PublicSurveyPresenter {
  @ApiProperty({ type: 'integer' })
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsDate()
  updatedAt: Date;

  @ApiProperty({
    description: 'Array of survey questions ids',
    type: () => Number,
  })
  questionIds: number[];

  constructor(survey: SurveyModel, questionIds: number[]) {
    this.id = survey.id;
    this.name = survey.name;
    this.description = survey.description;
    this.questionIds = questionIds;

    this.updatedAt = survey.updatedAt;
  }
}

export class GetPublicSurveyPresenter extends BaseResponsePresenter<PublicSurveyPresenter> {
  @ApiProperty({
    description: 'Public survey data',
    type: PublicSurveyPresenter,
  })
  @Type(() => PublicSurveyPresenter)
  data: PublicSurveyPresenter;
}

export class PublicAnswerPresenter {
  @ApiProperty({ type: 'integer' })
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsString()
  answer: string;

  @ApiProperty()
  @IsString()
  educationalTip: string;

  @ApiProperty()
  @IsBoolean()
  selected: boolean;

  constructor(answer: SurveyQuestionPossibleAnswerModel, selected: boolean) {
    this.id = answer.id;
    this.answer = answer.answer;
    this.educationalTip = answer.educationalTip;
    this.selected = selected ?? false;
  }
}

export class PublicSurveyQuestionPresenter {
  @ApiProperty({ type: 'integer' })
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsString()
  question: string;

  @ApiProperty()
  @IsBoolean()
  required: boolean;

  @ApiProperty({
    description: 'Array of survey questions possible answers',
    type: () => PublicAnswerPresenter,
  })
  answers: PublicAnswerPresenter[];

  constructor(question: SurveyQuestionModel, answers: PublicAnswerPresenter[]) {
    this.id = question.id;
    this.question = question.question;
    this.required = question.required;
    this.answers = answers;
  }
}

export class GetPublicSurveyQuestionPresenter extends BaseResponsePresenter<PublicSurveyQuestionPresenter> {
  @ApiProperty({
    description: 'Public survey questions & possible answers data',
    type: PublicSurveyQuestionPresenter,
  })
  @Type(() => PublicSurveyQuestionPresenter)
  data: PublicSurveyQuestionPresenter;
}

export class PersonSurveyPresenter {
  @ApiProperty()
  @IsUUID()
  referenceId: string;

  @ApiProperty()
  personCi: string;

  @ApiProperty({ type: 'integer' })
  @IsNumber()
  personId: number;

  @ApiProperty({ type: 'integer' })
  @IsNumber()
  surveyId: number;

  @ApiProperty({ type: 'integer' })
  @IsNumber()
  personSurveyId: number;

  constructor(
    referenceId: string,
    personCi: string,
    personId: number,
    surveyId: number,
    personSurveyId: number,
  ) {
    this.referenceId = referenceId;
    this.personCi = personCi;
    this.personId = personId;
    this.surveyId = surveyId;
    this.personSurveyId = personSurveyId;
  }
}

export class GetPersonSurveyPresenter extends BaseResponsePresenter<PersonSurveyPresenter> {
  @ApiProperty({
    description: 'Patient survey data',
    type: PersonSurveyPresenter,
  })
  @Type(() => PersonSurveyPresenter)
  data: PersonSurveyPresenter;
}
