import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { PersonSurvey } from './personSurvey.entity';
import { SurveyQuestionsPossibleAnswers } from './surveyQuestionsPossibleAnswers.entity';

@Entity('person_survey_answers')
export class PersonSurveyAnswers {
  @ManyToOne(
    () => PersonSurvey,
    (personSurvey) => personSurvey.personSurveyAnswers,
    {
      nullable: false,
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
  )
  @JoinColumn([
    { name: 'person_id', referencedColumnName: 'personId' },
    { name: 'survey_id', referencedColumnName: 'surveyId' },
    { name: 'person_survey_id', referencedColumnName: 'id' },
  ])
  personSurvey: PersonSurvey;

  @ManyToOne(
    () => SurveyQuestionsPossibleAnswers,
    (questionPossibleAnswer) => questionPossibleAnswer.possibleAnswers,
    {
      nullable: false,
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
  )
  @JoinColumn([
    { name: 'survey_id', referencedColumnName: 'surveyId' },
    { name: 'survey_question_id', referencedColumnName: 'surveyQuestionId' },
    { name: 'survey_question_answer_id', referencedColumnName: 'id' },
  ])
  questionPossibleAnswers: SurveyQuestionsPossibleAnswers;

  @PrimaryColumn({ type: 'bigint', name: 'person_id', comment: 'id column' })
  personId: number;

  @PrimaryColumn({ type: 'bigint', name: 'survey_id', comment: 'id column' })
  surveyId: number;

  @PrimaryColumn({
    type: 'bigint',
    name: 'person_survey_id',
    comment: 'id column',
  })
  personSurveyId: number;

  @PrimaryColumn({
    type: 'bigint',
    name: 'survey_question_id',
    comment: 'id column',
  })
  surveyQuestionId: number;

  @PrimaryColumn({
    type: 'bigint',
    name: 'survey_question_answer_id',
    comment: 'id column',
  })
  surveyQuestionAnswerId: number;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'created_at',
    comment: 'Entity create',
  })
  createdAt: Date;
}
