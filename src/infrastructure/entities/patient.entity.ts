import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { MedicalSpecialty } from './medical-specialty.entity';
import { Person } from './person.entity';
import { PersonSurvey } from './personSurvey.entity';
import { User } from './user.entity';

@Entity('patient')
@Index(['personId', 'surveyId', 'personSurveyId'], { unique: true })
export class Patient {
  @OneToOne(
    () => PersonSurvey,
    (personSurvey) => personSurvey.personSurveyAnswers,
    {
      nullable: false,
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
  )
  @JoinColumn([
    { name: 'person_id', referencedColumnName: 'personId' },
    { name: 'survey_id', referencedColumnName: 'surveyId' },
    { name: 'person_survey_id', referencedColumnName: 'id' },
  ])
  personSurvey: PersonSurvey;

  @OneToOne(() => Person, (person) => person.patient, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'person_id', referencedColumnName: 'id' })
  person: Person;

  @PrimaryColumn({ type: 'bigint', name: 'person_id', comment: 'id column' })
  personId: number;

  @Column({ type: 'bigint', name: 'survey_id', comment: 'id column' })
  surveyId: number;

  @Column({
    type: 'bigint',
    name: 'person_survey_id',
    comment: 'id column',
  })
  personSurveyId: number;

  @ManyToOne(() => User, (user) => user.id, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'medic_id' })
  medicId: number;

  @ManyToOne(() => MedicalSpecialty, (medSpecialty) => medSpecialty.id, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'medical_specialty_id' })
  medicalSpecialtyId: number;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'created_at',
    comment: 'Entity create',
  })
  createdAt: Date;
}
