import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('countries')
export class Country {
  @PrimaryColumn({ type: 'bigint', comment: 'id column' })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 100, nullable: false })
  @Index({ unique: true })
  name: string;

  @Column({ name: 'iso3', type: 'varchar', length: 3, nullable: false })
  @Index({ unique: true })
  iso3: string;

  @Column({ name: 'iso2', type: 'varchar', length: 2, nullable: false })
  @Index({ unique: true })
  iso2: string;

  @Column({
    name: 'country_code',
    type: 'varchar',
    length: 10,
    nullable: false,
  })
  @Index({ unique: true })
  countryCode: string;

  @Column({
    name: 'phone_code',
    type: 'varchar',
    length: 30,
    nullable: false,
  })
  phoneCode: string;

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
