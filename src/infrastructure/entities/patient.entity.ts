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

Entity('patient');
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
  @OneToOne(() => Person, (person) => person.id, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'id' })
  id: number;

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
}
