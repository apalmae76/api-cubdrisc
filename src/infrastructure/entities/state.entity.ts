import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Country } from './country.entity';

@Entity('states')
@Index(['countryId', 'name'], { unique: false })
@Index(['countryId', 'stateCode'], { unique: true })
export class State {
  @PrimaryGeneratedColumn({ type: 'bigint', comment: 'id column' })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ name: 'country_id', type: 'bigint' })
  countryId: number;

  @ManyToOne(() => Country, (country) => country.id, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'country_id' })
  country: Country;

  @Column({
    name: 'state_code',
    type: 'varchar',
    length: 10,
    nullable: false,
  })
  stateCode: string;

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
}
