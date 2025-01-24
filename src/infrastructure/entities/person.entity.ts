import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('person')
@Index(['ci'], { unique: true })
export class Person {
  @PrimaryGeneratedColumn({ type: 'bigint', comment: 'id column' })
  id: number;

  @Column({ name: 'ci', type: 'char', length: 11 })
  ci: string;

  @Column({ name: 'first_name', type: 'varchar', length: 80 })
  firstName: string;

  @Column({ name: 'middle_name', type: 'varchar', length: 80, nullable: true })
  middleName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 80 })
  lastName: string;

  @Column({
    name: 'second_last_name',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  secondLastName: string;

  @Column({
    name: 'full_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  fullName: string;

  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth: Date;

  @Column({ type: 'varchar', length: 80, nullable: true })
  gender: string;

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
}
