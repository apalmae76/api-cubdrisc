import { GetGenericAllDto } from 'src/infrastructure/common/dtos/genericRepo-dto.class';
import { PageDto } from 'src/infrastructure/common/dtos/page.dto';
import { EAppTypes } from 'src/infrastructure/common/utils/constants';
import { EAppRoles } from 'src/infrastructure/controllers/auth/role.enum';
import { EntityManager } from 'typeorm';
import { UserModel, UserUpdateModel } from '../model/user';

export interface IUserRepository {
  ensureExistOrFail(id: number): Promise<void>;
  create(user: UserModel, em: EntityManager): Promise<UserModel>;
  softDelete(id: number, em?: EntityManager): Promise<boolean>;
  updateIfExistOrFail(
    id: number,
    user: UserUpdateModel,
    em: EntityManager,
  ): Promise<boolean>;
  setEmail(
    id: number,
    email: string | null,
    em: EntityManager,
  ): Promise<boolean>;
  setPhone(
    id: number,
    phone: string | null,
    em: EntityManager,
  ): Promise<boolean>;
  getByQuery(pageOptionsDto: GetGenericAllDto): Promise<PageDto<UserModel>>;
  getByIdForPanel(id: number): Promise<UserModel>;
  getActiveUsersIdsByRoles(
    roles: EAppRoles[],
    lastUserId: number,
    pageSize: number,
  ): Promise<number[]>;
  getById(id: number): Promise<UserModel>;
  getHashRT(id: number, deviceKey: string, app: EAppTypes): Promise<UserModel>;
  getByIdOrFail(id: number): Promise<UserModel>;
  getByPhone(phone: string, isLogin: boolean): Promise<UserModel>;
  getIdByPhone(phone: string): Promise<number>;
  getByEmail(email: string, isLogin: boolean): Promise<UserModel>;
  getIdByEmail(email: string): Promise<number>;
  getPhoneOrFail(id: number, em?: EntityManager): Promise<string>;
  isPhoneInUse(phone: string): Promise<string | null>;
  isEmailInUse(email: string): Promise<string>;
  updateLastLogin(id: number, app: EAppTypes): Promise<UserModel>;
  updateHashRT(id: number, app: EAppTypes, refreshToken: string): Promise<void>;
  removeRefreshToken(id: number, app: EAppTypes): Promise<void>;
  delete(id: number, em: EntityManager): Promise<void>;
  usersAreSame(user1: UserModel, user2: UserUpdateModel): boolean;
}
