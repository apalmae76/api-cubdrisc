import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('medical_specialty')
export class MedicalSpecialty {
  @PrimaryGeneratedColumn({ type: 'smallint', comment: 'id column' })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 120, nullable: false })
  @Index({ unique: true })
  name: string;

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
    nullable: true,
    name: 'deleted_at',
    comment: 'Entity update',
  })
  deletedAt: Date;
}
