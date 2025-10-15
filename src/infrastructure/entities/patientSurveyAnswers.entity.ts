import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { PatientSurvey } from './patientSurvey.entity';
import { SurveyQuestionsPossibleAnswers } from './surveyQuestionsPossibleAnswers.entity';

@Entity('patient_survey_answers')
export class PatientSurveyAnswers {
  @ManyToOne(
    () => PatientSurvey,
    (patientSurvey) => patientSurvey.patientSurveyAnswers,
    {
      nullable: false,
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
  )
  @JoinColumn([
    { name: 'patient_id', referencedColumnName: 'patientId' },
    { name: 'survey_id', referencedColumnName: 'surveyId' },
  ])
  patientSurvey: PatientSurvey;
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

  @PrimaryColumn({ type: 'bigint', name: 'patient_id', comment: 'id column' })
  patientId: number;

  @PrimaryColumn({ type: 'bigint', name: 'survey_id', comment: 'id column' })
  surveyId: number;

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
