import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PatientSurvey } from './patientSurvey.entity';

@Entity('states')
@Index(['name'], { unique: false })
@Index(['code'], { unique: true })
export class State {
  @PrimaryGeneratedColumn({ type: 'bigint', comment: 'id column' })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({
    name: 'code',
    type: 'varchar',
    length: 10,
    nullable: false,
  })
  code: string;

  @CreateDateColumn({
    type: 'timestamp',
    nullable: false,
    name: 'created_at',
    comment: 'Entity create',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    nullable: false,
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
  deletedAt;

  @OneToMany(() => PatientSurvey, (patientSurvey) => patientSurvey.stateId)
  patientSurvey: PatientSurvey[];
}
