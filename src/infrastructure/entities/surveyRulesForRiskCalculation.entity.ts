import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Survey } from './survey.entity';

@Entity('survey_risk_calculation_rules')
@Index(['order'], { where: 'deleted_at IS NULL' })
@Index(['description'], { unique: true })
export class SurveyRiskCalculationRules {
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
  description: string;

  @Column({ type: 'smallint', name: 'min_range' })
  minRange: number;

  @Column({ type: 'smallint', name: 'max_range' })
  maxRange: number;

  @Column({
    type: 'smallint',
    name: 'percent',
    comment: 'percentage that represents',
  })
  percent: number;

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
