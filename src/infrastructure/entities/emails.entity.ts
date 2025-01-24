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

@Entity('user_emails')
export class UserEmails {
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

  @Column({
    name: 'email_address',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  emailAddress: string;

  @CreateDateColumn({
    type: 'timestamp',
    nullable: false,
    name: 'created_at',
    comment: 'Entity create',
  })
  createdAt: Date;
}
