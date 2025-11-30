import { IsEnum } from 'class-validator';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EOperatorsActions } from '../common/utils/constants';
import { User } from './user.entity';

@Entity('operators_actions')
@Index(['operatorId'])
@Index(['createdAt'])
export class OperatorsActions {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({ name: 'operator_id', type: 'bigint' })
  operatorId: number;

  @Column({
    name: 'action_id',
    type: 'smallint',
    nullable: false,
  })
  @IsEnum(EOperatorsActions)
  actionId: number;

  @Column({
    name: 'reason',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  reason: string;

  @Column({
    name: 'details',
    type: 'jsonb',
    nullable: true,
    default: null,
  })
  details: object;

  @CreateDateColumn({
    type: 'timestamp',
    nullable: false,
    name: 'created_at',
    comment: 'Operation create',
  })
  createdAt: Date;

  @ManyToOne(() => User, (operator) => operator.id, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'operator_id' })
  operator: User;
}
