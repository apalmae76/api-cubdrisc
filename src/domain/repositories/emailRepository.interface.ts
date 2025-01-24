import { EntityManager } from 'typeorm';
import { UserEmailModel } from '../model/email';

export interface IUserEmailRepository {
  create(
    userId: number,
    email: string,
    em: EntityManager,
  ): Promise<UserEmailModel>;
  getByUserId(userId: number): Promise<UserEmailModel[]>;
  isRregisteredByUser(
    userId: number,
    email: string,
    em: EntityManager,
  ): Promise<boolean>;
}
