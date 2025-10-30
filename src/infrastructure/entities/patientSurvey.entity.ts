import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Patient } from './patient.entity';
import { PatientSurveyAnswers } from './patientSurveyAnswers.entity';
import { State } from './state.entity';
import { Survey } from './survey.entity';

@Entity('patient_survey')
export class PatientSurvey {
  @ManyToOne(() => Patient, (patient) => patient.patientSurvey, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id', referencedColumnName: 'id' })
  patient: Patient;

  @ManyToOne(() => Survey, (survey) => survey.patientSurvey, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'survey_id', referencedColumnName: 'id' })
  survey: Survey;

  @PrimaryColumn({ type: 'bigint', name: 'patient_id', comment: 'id column' })
  patientId: number;

  @PrimaryColumn({ type: 'bigint', name: 'survey_id', comment: 'id column' })
  surveyId: number;

  @ManyToOne(() => State, (state) => state.id, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'state_id', referencedColumnName: 'id' })
  state: State;

  @Column({ type: 'bigint', name: 'state_id', comment: 'id column' })
  stateId: number;

  @Column({
    type: 'smallint',
    name: 'age',
  })
  age: number;

  @Column({
    type: 'smallint',
    name: 'total_score',
  })
  totalScore: number;

  @Column({
    type: 'float',
    name: 'waist_perimeter',
  })
  waistPerimeter: number;

  @Column({
    type: 'float',
  })
  weight: number;

  @Column({
    type: 'float',
  })
  size: number;

  @Column({
    type: 'float',
  })
  imcc: number;

  @Column({
    type: 'float',
    name: 'estimated_risk',
  })
  estimatedRisk: number;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'created_at',
    comment: 'Entity create',
  })
  createdAt: Date;

  @OneToMany(
    () => PatientSurveyAnswers,
    (patientSurveyAnswers) => patientSurveyAnswers.patientSurvey,
  )
  patientSurveyAnswers: PatientSurveyAnswers[];
}
