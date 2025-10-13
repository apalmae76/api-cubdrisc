import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Patient } from './patient.entity';
import { SurveyQuestionsPossibleAnswers } from './surveyQuestionsPossibleAnswers.entity';

@Entity('patient_survey_answers')
@Index(['order'], { where: 'deleted_at IS NULL' })
export class PatientSurveyAnswers {
  @ManyToOne(() => Patient, (patient) => patient.surveyAnswers, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id', referencedColumnName: 'id' })
  patient: Patient;

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

  @Column({ type: 'text' })
  answer: string;

  @Column({ type: 'text', name: 'educational_tip' })
  educationalTip: string;

  @Column({
    name: 'order',
    type: 'smallint',
  })
  order: number;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'created_at',
    comment: 'Entity create',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    name: 'updated_at',
    comment: 'Entity update',
  })
  updatedAt: Date;

  @DeleteDateColumn({
    type: 'timestamp',
    comment: 'Entity delete',
    nullable: true,
    default: null,
    name: 'deleted_at',
  })
  deletedAt: Date;
}
