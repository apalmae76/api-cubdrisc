/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PersonCreateModel,
  PersonModel,
  PersonUpdateModel,
} from 'src/domain/model/person';
import { IPersonRepository } from 'src/domain/repositories/personRepository.interface';
import { EntityManager, Repository } from 'typeorm';
import { UserModel } from '../../domain/model/user';
import {
  EQueryOperators,
  GetGenericAllDto,
} from '../common/dtos/genericRepo-dto.class';
import { PageDto } from '../common/dtos/page.dto';
import { PageMetaDto } from '../common/dtos/pageMeta.dto';
import { EAppTypes, SYSTEM_USER_ID } from '../common/utils/constants';
import { Person } from '../entities/person.entity';
import { ApiLoggerService } from '../services/logger/logger.service';
import { ApiRedisService } from '../services/redis/redis.service';
import { BaseRepository } from './base.repository';

@Injectable()
export class DatabasePersonRepository
  extends BaseRepository
  implements IPersonRepository {
  private readonly cacheKey = 'Repository:Person:';
  private readonly cacheTime = 15 * 60; // 15 mins
  constructor(
    @InjectRepository(Person)
    private readonly personEntity: Repository<Person>,
    private readonly redisService: ApiRedisService,
    protected readonly logger: ApiLoggerService,
  ) {
    super(personEntity, logger);
  }

  async create(
    person: PersonCreateModel,
    em: EntityManager,
  ): Promise<PersonModel> {
    const repo = em ? em.getRepository(Person) : this.personEntity;
    const entity = await repo.save(this.toCreate(person));
    return this.toModel(entity);
  }

  async updateIfExistOrFail(
    id: number,
    person: PersonUpdateModel,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em ? em.getRepository(Person) : this.personEntity;
    const entity = await repo.findOne({ where: { id: id } });
    if (!person) {
      throw new NotFoundException({
        message: [`validation.profile.USER_NOT_FOUND|{"userId":"${id}"}`],
      });
    }
    entity.ci = person.ci;
    entity.firstName = person.firstName;
    entity.middleName = person.middleName;
    entity.lastName = person.lastName;
    entity.secondLastName = person.secondLastName;
    entity.fullName = this.getFullName(entity);

    entity.dateOfBirth = person.dateOfBirth;
    entity.gender = person.gender;

    await repo.save(entity);
    await this.cleanCacheData(id);
    return true;
  }

  private async cleanCacheData(id: number, app: EAppTypes | null = null) {
    const cacheKey = `${this.cacheKey}${id}`;
    await this.redisService.del(cacheKey);
  }

  getBasicQuery() {
    return this.personEntity
      .createQueryBuilder('person')
      .select([
        'person.id as "id"',
        'person.ci as "ci"',
        'person.first_name as "firstName"',
        'person.middle_name as "middleName"',
        'person.last_name as "lastName"',
        'person.second_last_name as "secondLastName"',
        'person.full_name as "fullName"',
        'person.date_of_birth as "dateOfBirth"',
        'person.gender as "gender"',
        'person.created_at as "createdAt"',
        'person.updated_at as "updatedAt"',
      ])
      .withDeleted();
  }

  async getByIdForPanel(id: number): Promise<PersonModel> {
    const query = this.getBasicQuery();
    query.where('user.id = :id', { id });
    const person = await query.getRawOne();
    if (!person) {
      return null;
    }
    return this.toModel(person, true);
  }

  async getByQuery(queryDto: GetGenericAllDto): Promise<PageDto<PersonModel>> {
    const userId = super.atrIsIncludedAndGetValOp(
      queryDto.filter,
      'id',
      'bigint',
      'userIdValue',
    );

    if (userId.condition === null || parseInt(userId.value) === 0) {
      if (queryDto.filter && queryDto.filter.length) {
        queryDto.filter = `${queryDto.filter.slice(0, -1)},{"atr":"id","op":"${EQueryOperators.GREATER
          }","value":"${SYSTEM_USER_ID}"}]`;
      } else {
        queryDto.filter = `[{"atr":"id","op":"${EQueryOperators.GREATER}","value":"${SYSTEM_USER_ID}"}]`;
      }
    }

    const queryCount = null;
    const queryList = this.getBasicQuery();

    const query = await super.getByQueryBase<Person>(
      queryDto,
      'person',
      queryCount,
      queryList,
      false,
    );

    const persons = query.entities.map((person) => this.toModel(person));

    const pageMetaDto = new PageMetaDto({
      total: query.itemCount,
      pageOptionsDto: queryDto,
      itemPageCount: persons.length,
    });

    return new PageDto(persons, pageMetaDto);
  }

  async ensureExistOrFail(id: number) {
    await this.getByIdOrFail(id);
  }

  async getByIdOrFail(id: number): Promise<PersonModel> {
    const person = await this.getById(id);
    if (!person) {
      throw new NotFoundException({
        message: [`validation.profile.USER_NOT_FOUND|{"userId":"${id}"}`],
      });
    }
    return person;
  }

  async getById(id: number, useCache = true): Promise<PersonModel> {
    let cacheKey = null;
    let personData: PersonModel = null;
    if (useCache) {
      cacheKey = `${this.cacheKey}${id}`;
      const userData = await this.redisService.get<PersonModel>(cacheKey);
      if (userData) {
        return userData;
      }
    }
    const query = await this.personEntity
      .createQueryBuilder()
      .select([
        'id as "id"',
        'ci as "ci"',
        'full_name as "fullName"',
        'first_name as "firstName"',
        'middle_name as "middleName"',
        'last_name as "lastName"',
        'second_last_name as "secondLastName"',
        'date_of_birth as "dateOfBirth"',
        'gender',
        'created_at as "createdAt"',
        'updated_at as "updatedAt"',
      ]);
    const person = await query.where('id = :id', { id }).getRawOne();
    if (!person) {
      return null;
    }
    personData = this.toModel(person);
    if (cacheKey) {
      await this.redisService.set<PersonModel>(
        cacheKey,
        personData,
        this.cacheTime,
      );
    }
    return personData;
  }

  async getByCi(ci: string): Promise<PersonModel> {
    const person = await this.personEntity.findOne({
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        secondLastName: true,
        fullName: true,
      },
      where: { ci },
    });
    if (!person) {
      return null;
    }
    return this.toModel(person);
  }

  personsAreSame(
    person1: PersonUpdateModel,
    person2: PersonUpdateModel,
  ): boolean {
    const u1DateOfBirth = person1.dateOfBirth
      ? new Date(person1.dateOfBirth)
      : null;
    const sameDateOfBirth =
      (u1DateOfBirth &&
        u1DateOfBirth.toISOString().slice(0, 10) ===
        `${person2.dateOfBirth}`) ||
      person1.dateOfBirth == person2.dateOfBirth;
    return (
      person1.ci === person2.ci &&
      person1.firstName === person2.firstName &&
      person1.middleName === person2.middleName &&
      person1.lastName === person2.lastName &&
      person1.secondLastName === person2.secondLastName &&
      sameDateOfBirth &&
      person1.gender === person2.gender
    );
  }

  toModel(entity: Person, isForPanel = false): PersonModel {
    const model: UserModel = new UserModel();

    if (!isForPanel) {
      model.id = Number(entity.id);
    }
    model.ci = entity.ci;
    model.firstName = entity.firstName;
    model.middleName = entity.middleName;
    model.lastName = entity.lastName;
    model.secondLastName = entity.secondLastName;
    model.fullName = entity.fullName;

    model.dateOfBirth = entity.dateOfBirth;
    model.gender = entity.gender;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;

    return model;
  }

  private toCreate(model: PersonCreateModel): Person {
    const entity = new Person();

    entity.ci = model.ci;
    entity.firstName = model.firstName;
    entity.middleName = model.middleName;
    entity.lastName = model.lastName;
    entity.secondLastName = model.secondLastName;
    entity.fullName = this.getFullName(model);

    entity.dateOfBirth = model.dateOfBirth;
    entity.gender = model.gender;

    return entity;
  }

  private getFullName(model: PersonCreateModel): string {
    const middleName = model.middleName ? ' ' + model.middleName : '';
    const secondLastName = model.secondLastName
      ? ' ' + model.secondLastName
      : '';
    return `${model.firstName}${middleName} ${model.lastName}${secondLastName}`
      .replace(/[\s-]/g, ' ')
      .trim();
  }
}
