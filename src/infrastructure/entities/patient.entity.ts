import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PatientSurvey } from './patientSurvey.entity';
import { Person } from './person.entity';

@Entity('patient')
@Index(['id'], { where: 'deleted_at IS NULL' })
@Index(['phone'], {
  unique: true,
  where: 'phone is not null and deleted_at IS NULL',
})
@Index(['email'], {
  unique: true,
  where: 'phone is not null and deleted_at IS NULL',
})
export class Patient {
  @PrimaryColumn({ type: 'bigint', comment: 'id column' })
  id: number;

  @OneToOne(() => Person, (person) => person.patient, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'id', referencedColumnName: 'id' })
  person: Person;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({
    name: 'diagnosed',
    type: 'date',
    nullable: true,
    default: null,
  })
  diagnosed: Date;

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
}
