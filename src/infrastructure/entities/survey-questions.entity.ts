import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SurveyQuestionsPossibleAnswers } from './survey-questions-possible-answers.entity';
import { Survey } from './survey.entity';

@Entity('survey_questions')
@Index(['order'], { where: 'deleted_at IS NULL' })
export class SurveyQuestions {
  @ManyToOne(() => Survey, (survey) => survey.id, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'survey_id' })
  survey: Survey;

  @PrimaryColumn({ type: 'bigint', name: 'survey_id', comment: 'id column' })
  surveyId: number;

  @PrimaryGeneratedColumn({ type: 'bigint', comment: 'id column' })
  id: number;

  @Column({ type: 'text' })
  question: string;

  @Column({
    name: 'order',
    type: 'smallint',
  })
  order: number;

  @Column({
    type: 'boolean',
    default: false,
  })
  required: boolean;

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

  @OneToMany(() => SurveyQuestionsPossibleAnswers, (answer) => answer.question)
  possibleAnswers: SurveyQuestionsPossibleAnswers[];
}
