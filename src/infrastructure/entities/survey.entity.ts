import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PatientSurvey } from './patientSurvey.entity';
import { SurveyQuestions } from './surveyQuestions.entity';
import { SurveyRiskCalculationRanges } from './surveyRangesForRiskCalculation.entity';

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
    name: 'calc_risks',
    comment: 'run risk calculation when responding',
    default: false,
  })
  calcRisks: boolean;

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

  @OneToMany(() => PatientSurvey, (patientSurvey) => patientSurvey.survey)
  patientSurvey: PatientSurvey[];

  @OneToMany(() => SurveyQuestions, (question) => question.survey)
  questions: SurveyQuestions[];

  @OneToMany(() => SurveyRiskCalculationRanges, (rcRange) => rcRange.survey)
  rcRanges: SurveyRiskCalculationRanges[];
}
