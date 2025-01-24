import { MetaData } from 'src/domain/model/user';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Key2ValueObjectList } from '../common/interfaces/common';
import { EAppRoles } from '../controllers/auth/role.enum';
import { MedicalSpecialty } from './medicalSpecialty.entity';
import { Person } from './person.entity';

@Entity('users')
@Index(['phone'], { unique: true, where: 'deleted_at IS NULL' })
@Index(['email'], { unique: true, where: 'deleted_at IS NULL' })
export class User {
  @PrimaryColumn({ type: 'bigint', comment: 'id column' })
  @OneToOne(() => Person, (person) => person.id, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'id' })
  id: number;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @ManyToOne(() => MedicalSpecialty, (medSpecialty) => medSpecialty.id, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'medical_specialty_id' })
  medicalSpecialtyId: number;

  @Column({
    type: 'enum',
    enum: EAppRoles,
    enumName: 'roles_enum',
    array: true,
    default: [EAppRoles.MEDIC],
  })
  roles: EAppRoles[];

  @Column({
    name: 'hash_refresh_token',
    type: 'jsonb',
    nullable: true,
    select: false,
  })
  hashRefreshToken: Key2ValueObjectList<string>;

  @Column({
    name: 'meta',
    type: 'jsonb',
    nullable: true,
  })
  meta: MetaData;

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
