import { GetGenericAllDto } from 'src/infrastructure/common/dtos/genericRepo-dto.class';
import { PageDto } from 'src/infrastructure/common/dtos/page.dto';
import { EntityManager } from 'typeorm';
import {
  UserPhonesCreateModel,
  UserPhonesModel,
  UserPhonesPanelModel,
} from '../model/phone';

export interface IUserPhoneRepository {
  create(
    phoneData: UserPhonesCreateModel,
    em: EntityManager,
  ): Promise<UserPhonesModel>;
  getByUserId(userId: number): Promise<UserPhonesModel>;
  isRegisteredByUserId(
    userId: number,
    phone: string,
    em: EntityManager,
  ): Promise<boolean>;
  getByQuery(
    queryDto: GetGenericAllDto,
  ): Promise<PageDto<UserPhonesPanelModel>>;
}
