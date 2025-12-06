import {
  Column,
  CreateDateColumn,
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
@Index(['surveyId', 'order'])
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

  @Column({ type: 'varchar', length: 20, nullable: false })
  gender: string;

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

  @OneToMany(() => SurveyQuestionsPossibleAnswers, (answer) => answer.question)
  possibleAnswers: SurveyQuestionsPossibleAnswers[];
}
