import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PersonSurveyAnswers } from './person-survey-answers.entity';
import { SurveyQuestions } from './survey-questions.entity';

@Entity('survey_questions_possible_answers')
@Index(['surveyId', 'surveyQuestionId', 'order'])
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

  @Column({ type: 'text', name: 'educational_tip', nullable: true })
  educationalTip: string;

  @Column({
    type: 'smallint',
    name: 'value',
    comment: 'id column',
  })
  value: number;

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

  @ManyToMany(
    () => PersonSurveyAnswers,
    (answer) => answer.questionPossibleAnswers,
  )
  possibleAnswers: PersonSurveyAnswers[];
}
