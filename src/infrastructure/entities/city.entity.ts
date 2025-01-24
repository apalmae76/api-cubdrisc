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
import { State } from './state.entity';

@Entity('cities')
// TODO Verify the info to be able to create this index as unique
@Index(['countryId', 'stateId', 'name'], { unique: false })
@Index(['countryId', 'stateId', 'id'], { unique: true })
export class City {
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

  @Column({ name: 'state_id', type: 'bigint' })
  stateId: number;

  @ManyToOne(() => State, (state) => state.id, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'state_id' })
  state: State;

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
