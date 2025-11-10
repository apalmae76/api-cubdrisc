import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PersonSurvey } from './personSurvey.entity';
import { SurveyQuestions } from './surveyQuestions.entity';
import { SurveyRiskCalculationRules } from './surveyRulesForRiskCalculation.entity';

@Entity('survey')
export class Survey {
  @PrimaryGeneratedColumn({ type: 'bigint', comment: 'id column' })
  id: number;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

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

  @OneToMany(() => PersonSurvey, (personSurvey) => personSurvey.survey)
  personSurvey: PersonSurvey[];

  @OneToMany(() => SurveyQuestions, (question) => question.survey)
  questions: SurveyQuestions[];

  @OneToMany(() => SurveyRiskCalculationRules, (rcRange) => rcRange.survey)
  rcRules: SurveyRiskCalculationRules[];
}
