import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PatientSurveyAnswers } from './patientSurveyAnswers.entity';
import { SurveyQuestions } from './surveyQuestions.entity';

@Entity('survey_questions_possible_answers')
@Index(['order'], { where: 'deleted_at IS NULL' })
export class SurveyQuestionsPossibleAnswers {
  @ManyToOne(() => SurveyQuestions, (question) => question.possibleAnswers, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([
    { name: 'survey_id', referencedColumnName: 'surveyId' },
    { name: 'survey_question_id', referencedColumnName: 'id' },
  ])
  question: SurveyQuestions;

  @PrimaryColumn({ type: 'bigint', name: 'survey_id', comment: 'id column' })
  surveyId: number;

  @PrimaryColumn({
    type: 'bigint',
    name: 'survey_question_id',
    comment: 'id column',
  })
  surveyQuestionId: number;

  @PrimaryGeneratedColumn({ type: 'bigint', comment: 'id column' })
  id: number;

  @Column({ type: 'text' })
  answer: string;

  @Column({ type: 'text', name: 'educational_tip' })
  educationalTip: string;

  @Column({
    name: 'order',
    type: 'smallint',
  })
  order: number;

  @Column({
    type: 'boolean',
    default: false,
  })
  active: boolean;

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

  @ManyToMany(
    () => PatientSurveyAnswers,
    (answer) => answer.questionPossibleAnswers,
  )
  possibleAnswers: PatientSurveyAnswers[];
}
