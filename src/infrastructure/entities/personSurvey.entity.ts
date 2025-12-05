import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Patient } from './patient.entity';
import { PersonSurveyAnswers } from './person-survey-answers.entity';
import { Person } from './person.entity';
import { State } from './state.entity';
import { Survey } from './survey.entity';

@Entity('person_survey')
@Check('not (phone is null and email is null)')
export class PersonSurvey {
  @ManyToOne(() => Person, (person) => person.personSurvey, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'person_id', referencedColumnName: 'id' })
  person: Person;

  @ManyToOne(() => Survey, (survey) => survey.personSurvey, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'survey_id', referencedColumnName: 'id' })
  survey: Survey;

  @PrimaryColumn({
    type: 'bigint',
    name: 'person_id',
    comment: 'person id column',
  })
  personId: number;

  @PrimaryColumn({
    type: 'bigint',
    name: 'survey_id',
    comment: 'survey id column',
  })
  surveyId: number;

  @PrimaryGeneratedColumn({
    type: 'bigint',
    comment: 'id column',
  })
  id: number;

  @ManyToOne(() => State, (state) => state.id, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'state_id', referencedColumnName: 'id' })
  state: State;

  @Column({ type: 'bigint', name: 'state_id', comment: 'id column' })
  stateId: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({
    type: 'smallint',
    name: 'age',
  })
  age: number;

  @Column({
    type: 'float',
    nullable: true,
  })
  weight: number;

  @Column({
    type: 'float',
    nullable: true,
  })
  size: number;

  @Column({
    type: 'float',
    name: 'imc_value',
    nullable: true,
  })
  imcValue: number;

  @Column({
    type: 'smallint',
    name: 'imc_points',
    nullable: true,
  })
  imcPoints: number;

  @Column({
    type: 'varchar',
    length: 30,
    name: 'imc_category',
    nullable: true,
  })
  imcCategory: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'estimated_risk',
    nullable: true,
  })
  estimatedRisk: string;

  @Column({
    type: 'smallint',
    name: 'total_score',
    nullable: true,
  })
  totalScore: number;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'created_at',
    comment: 'Entity create',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    name: 'updated_at',
    comment: 'Entity create',
  })
  updatedAt: Date;

  @OneToMany(
    () => PersonSurveyAnswers,
    (personSurveyAnswers) => personSurveyAnswers.personSurvey,
  )
  personSurveyAnswers: PersonSurveyAnswers[];

  @OneToOne(() => Patient, (patient) => patient.personSurvey)
  patient: Patient;
}
