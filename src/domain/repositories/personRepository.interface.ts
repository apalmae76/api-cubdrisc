import { GetGenericAllDto } from 'src/infrastructure/common/dtos/genericRepo-dto.class';
import { PageDto } from 'src/infrastructure/common/dtos/page.dto';
import { EntityManager } from 'typeorm';
import { PersonModel, PersonUpdateModel } from '../model/person';

export interface IPersonRepository {
  create(user: PersonModel, em: EntityManager): Promise<PersonModel>;
  updateIfExistOrFail(
    id: number,
    user: PersonUpdateModel,
    em: EntityManager,
  ): Promise<boolean>;
  ensureExistOrFail(id: number): Promise<void>;
  getByQuery(pageOptionsDto: GetGenericAllDto): Promise<PageDto<PersonModel>>;
  getByIdForPanel(id: number): Promise<PersonModel>;
  getById(id: number): Promise<PersonModel>;
  getByIdOrFail(id: number): Promise<PersonModel>;
  personsAreSame(user1: PersonUpdateModel, user2: PersonUpdateModel): boolean;
}
