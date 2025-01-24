import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_phones')
export class UserPhones {
  @PrimaryColumn({ name: 'user_id', type: 'bigint' })
  userId: number;

  @ManyToOne(() => User, (user) => user.id, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @PrimaryGeneratedColumn({ type: 'bigint', comment: 'id column' })
  id: number;

  @Column({ type: 'varchar', length: 20, nullable: false })
  phone: string;

  @Column({
    name: 'national_format',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  nationalFormat: string;

  @Column({ name: 'country_iso2', type: 'varchar', length: 2, nullable: true })
  countryIso2: string;

  @Column({
    name: 'mobile_country_code',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  mobileCountryCode: string;

  @Column({
    name: 'mobile_network_code',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  mobileNetworkCode: string;

  @Column({
    name: 'carrier_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  carrierName: string;

  @CreateDateColumn({
    type: 'timestamp',
    nullable: false,
    name: 'created_at',
    comment: 'Entity create',
  })
  createdAt: Date;
}
