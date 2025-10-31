import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Person } from './person.entity';

@Entity('patient')
@Index(['personId'], { where: 'deleted_at IS NULL' })
export class Patient {
  @OneToOne(() => Person, (person) => person.personPatient, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'person_id', referencedColumnName: 'id' })
  person: Person;

  @PrimaryColumn({ type: 'bigint', name: 'person_id', comment: 'id column' })
  personId: number;

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
}
