/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AreCiPhoneMailValid } from 'src/domain/model/is-phone-and-mail-valid';
import { PersonModel } from 'src/domain/model/person';
import {
  EntityManager,
  FindOptionsWhere,
  IsNull,
  LessThan,
  Not,
  Repository,
} from 'typeorm';
import { MetaData, UserModel, UserUpdateModel } from '../../domain/model/user';
import { IUserRepository } from '../../domain/repositories/userRepository.interface';
import {
  EQueryOperators,
  GetGenericAllDto,
} from '../common/dtos/genericRepo-dto.class';
import { PageDto } from '../common/dtos/page.dto';
import { PageMetaDto } from '../common/dtos/pageMeta.dto';
import { EAppTypes, SYSTEM_USER_ID } from '../common/utils/constants';
import { EAppRoles } from '../controllers/auth/role.enum';
import { OperatorsActions } from '../entities/operatorsActions.entity';
import { Person } from '../entities/person.entity';
import { User } from '../entities/user.entity';
import { ApiLoggerService } from '../services/logger/logger.service';
import { ApiRedisService } from '../services/redis/redis.service';
import { BaseRepository } from './base.repository';
import { DatabasePersonRepository } from './person.repository';

export enum EUserMetaAttributes {
  paymentVerifyPending = 'paymentVerifyPending',
  defaultLan = 'defaultLan',
}
@Injectable()
export class DatabaseUserRepository
  extends BaseRepository
  implements IUserRepository {
  private readonly cacheKey = 'Repository:User:';
  private readonly cacheTime = 15 * 60; // 15 mins
  constructor(
    @InjectRepository(User)
    private readonly userEntity: Repository<User>,
    private readonly personRepo: DatabasePersonRepository,
    private readonly redisService: ApiRedisService,
    protected readonly logger: ApiLoggerService,
  ) {
    super(userEntity, logger);
  }

  async create(user: UserModel, em: EntityManager): Promise<UserModel> {
    const person = await this.personRepo.create(user, em);
    const repo = em ? em.getRepository(User) : this.userEntity;
    const userEntity = this.toCreate({ ...user, id: person.id });
    const userSaved = await repo.save(userEntity);
    return this.toModel(userSaved, person);
  }

  async updateIfExistOrFail(
    id: number,
    user: UserUpdateModel,
    em: EntityManager,
  ): Promise<boolean> {
    await this.personRepo.update(id, user, em);
    const repo = em ? em.getRepository(User) : this.userEntity;
    const userEntity = await repo.findOne({ where: { id: id } });
    if (!user) {
      throw new NotFoundException({
        message: [`validation.profile.USER_NOT_FOUND|{"userId":"${id}"}`],
      });
    }

    await repo.update(
      { id },
      {
        phone: user.phone,
        email: user.email,
        medicalSpecialtyId: user.medicalSpecialtyId,
      },
    );
    await this.cleanCacheData(id);
    return true;
  }

  async softDelete(id: number, em: EntityManager = null): Promise<boolean> {
    const repo = em ? em.getRepository(User) : this.userEntity;

    await this.cleanCacheData(id);
    const { affected } = await repo
      .createQueryBuilder()
      .update(User)
      .set({ deletedAt: new Date() })
      .where('id = :id and deleted_at is null', { id })
      .execute();
    if (!affected) {
      const rowIsDeleted = await this.isRowDeleted(id);
      if (rowIsDeleted === null) {
        this.logger.warn(
          `User repository, soft delete: Sended id does not exist `,
          {
            affected,
            rowIsDeleted: rowIsDeleted ? rowIsDeleted : 'NULL',
            context: `${DatabaseUserRepository.name}.softDelete`,
          },
        );
      }
    }
    return affected > 0;
  }

  private async isRowDeleted(id: number): Promise<boolean> {
    const row = await this.userEntity
      .createQueryBuilder()
      .select(['deleted_at as "deletedAt"'])
      .withDeleted()
      .where('id = :id', { id })
      .getRawOne();
    if (row) {
      return row.deletedAt !== null;
    }
    return null;
  }

  private async cleanCacheData(id: number, app: EAppTypes | null = null) {
    const cacheKey = `${this.cacheKey}${id}`;
    await this.redisService.del(cacheKey);
    const metaCacheKey = `${cacheKey}:meta`;
    await this.redisService.del(metaCacheKey);
    if (app) {
      const jwtDataCacheKey = `${this.cacheKey}JWTData:${app}:${id}`;
      await this.redisService.del(jwtDataCacheKey);
    }
  }

  getBasicQuery() {
    return this.userEntity
      .createQueryBuilder('user')
      .select([
        'user.id as "id"',
        'pers.ci as "ci"',
        'pers.first_name as "firstName"',
        'pers.middle_name as "middleName"',
        'pers.last_name as "lastName"',
        'pers.second_last_name as "secondLastName"',
        'pers.full_name as "fullName"',
        'pers.date_of_birth as "dateOfBirth"',
        'pers.gender as "gender"',
        'user.phone as "phone"',
        'user.email as "email"',
        'user.roles as "roles"',
        'user.medical_specialty_id as "medicalSpecialtyId"',
        'user.meta as "meta"',
        'user.created_at as "createdAt"',
        'user.updated_at as "updatedAt"',
        'user.deleted_at as "deletedAt"',
      ])
      .withDeleted()
      .innerJoin(Person, 'pers', 'pers.id = user.id')
      .withDeleted();
  }

  async getByIdForPanel(id: number): Promise<UserModel> {
    const query = this.getBasicQuery();
    query.where('user.id = :id', { id });
    const user = await query.getRawOne();
    if (!user) {
      return null;
    }
    return this.toModelPanel(user, true);
  }

  async getByQuery(queryDto: GetGenericAllDto): Promise<PageDto<UserModel>> {
    const listOfEnumsAtrs = {
      roles: 'EAppRoles',
    };
    queryDto.filter = super.convertEnumFilterValues(
      queryDto.filter,
      listOfEnumsAtrs,
    );

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

    let queryCount = null;
    const queryList = this.getBasicQuery();

    const roles = super.atrIsIncludedAndGetValOp(
      queryDto.filter,
      'roles',
      'varchar',
      'rolesValue',
    );

    if (roles.condition) {
      if (queryCount === null) {
        queryCount = this.userEntity.createQueryBuilder('user');
      }
      const rolesValue = roles.value;
      queryCount.andWhere(':rolesValue = ANY(roles)', { rolesValue });
      queryList.andWhere(':rolesValue = ANY(roles)', { rolesValue });
    }

    const query = await super.getByQueryBase<User>(
      queryDto,
      'user',
      queryCount,
      queryList,
      false,
    );

    const users = query.entities.map((user) => this.toModelPanel(user, true));

    const pageMetaDto = new PageMetaDto({
      total: query.itemCount,
      pageOptionsDto: queryDto,
      itemPageCount: users.length,
    });

    return new PageDto(users, pageMetaDto);
  }

  async ensureExistOrFail(id: number) {
    await this.getByIdOrFail(id);
  }

  async getUserIdIfExistOrFailByPhone(
    phone: string,
    role: EAppRoles = null,
  ): Promise<number> {
    const user = await this.userEntity.findOne({
      select: ['id', 'roles'],
      where: { phone },
    });

    if (user === null) {
      throw new NotFoundException({
        message: [`validation.profile.USER_NOT_FOUND|{"detail":" (${phone})"}`],
      });
    }
    if (role && !user.roles.includes(role)) {
      throw new NotFoundException({
        message: [
          `validation.profile.USER_NOT_FOUND|{"detail":" (${phone})","rol":"${user.roles}"}`,
        ],
      });
    }
    return Number(user.id);
  }

  async getUserIdIfExistOrFailByEmail(
    email: string,
    role: EAppRoles = null,
  ): Promise<number> {
    const user = await this.userEntity.findOne({
      select: ['id', 'roles'],
      where: { email },
    });

    if (user === null) {
      throw new NotFoundException({
        message: [`validation.profile.USER_NOT_FOUND|{"detail":" (${email})"}`],
      });
    }
    if (role && !user.roles.includes(role)) {
      throw new ForbiddenException({
        message: [
          `validation.profile.USER_NOT_FOUND|{"detail":" (${email})","rol":"${user.roles}"}`,
        ],
      });
    }
    return Number(user.id);
  }

  async getByIdOrFail(id: number): Promise<UserModel> {
    const user = await this.getById(id);
    if (!user) {
      throw new NotFoundException({
        message: [`validation.profile.USER_NOT_FOUND|{"userId":"${id}"}`],
      });
    }
    return user;
  }

  async getById(id: number, useCache = true): Promise<UserModel> {
    let cacheKey = null;
    let userData: UserModel = null;
    if (useCache) {
      cacheKey = `${this.cacheKey}${id}`;
      const userData = await this.redisService.get<UserModel>(cacheKey);
      if (userData) {
        return userData;
      }
    }
    const query = this.getBasicQuery();
    const user = await query.where('user.id = :id', { id }).getRawOne();
    if (!user) {
      return null;
    }
    userData = this.toModel(user, user, true);
    if (cacheKey) {
      await this.redisService.set<UserModel>(
        cacheKey,
        userData,
        this.cacheTime,
      );
    }
    return userData;
  }

  async getHashRT(id: number, app: EAppTypes): Promise<UserModel> {
    const query = await this.userEntity
      .createQueryBuilder()
      .select([
        'id',
        'roles',
        'email',
        'hash_refresh_token as "hashRefreshToken"',
      ]);

    const user = await query.where('id = :id', { id }).getRawOne();
    if (!user) {
      return null;
    }
    if (app === null) {
      return user;
    }
    if (user.hashRefreshToken) {
      try {
        const hash = user.hashRefreshToken;
        user.hashRefreshToken = hash[app] && hash[app] ? hash[app] : null;
      } catch (er) {
        user.hashRefreshToken = null;
      }
    }
    user.id = Number(user.id);
    return user;
  }

  /**
   * Clean hashRefreshToken for users with last activity before a given date.
   * @param date reference date.
   * @returns number of rows affected
   */
  async cleanSessionHashInactiveBeforeDate(date: Date) {
    const options: FindOptionsWhere<User> = {
      updatedAt: LessThan(date),
      hashRefreshToken: Not(IsNull()),
    };
    const data = await this.userEntity.update(options, {
      hashRefreshToken: null,
    });
    return data.affected;
  }

  async getActiveUsersIdsByRoles(
    roles: EAppRoles[],
    lastUserId: number = null,
    pageSize: number = null,
  ): Promise<number[]> {
    const query = this.userEntity
      .createQueryBuilder('us')
      .select(['us.id as "id"'])
      .where(
        '(ARRAY[:...roles]::varchar[] && ARRAY(SELECT role::varchar FROM UNNEST(us.roles) AS role))',
        {
          roles,
        },
      );

    if (lastUserId) {
      query.andWhere('us.id > :lastUserId', { lastUserId });
    }

    query.orderBy('us.id', 'ASC');

    if (pageSize) {
      query.limit(pageSize);
    }

    const userIds = await query.getRawMany();

    if (!userIds) {
      return null;
    }
    return userIds.map((user) => Number(user.id));
  }

  async getByPhone(phone: string, isLogin = false): Promise<UserModel> {
    const query = this.getBasicQuery();
    query.where('user.phone = :phone', { phone });
    const user = await query.getRawOne();
    if (!user) {
      return null;
    }
    return this.toModel(user, user, true);
  }

  async getIdByPhone(phone: string): Promise<number> {
    const user = await this.userEntity.findOne({
      select: ['id'],
      where: { phone: phone },
    });
    if (!user || !user.id) {
      return null;
    }
    return Number(user.id);
  }

  async getByEmail(email: string, isLogin = false): Promise<UserModel> {
    const query = this.getBasicQuery();
    query.where('user.email = :email', { email });
    const user = await query.getRawOne();
    if (!user) {
      return null;
    }
    return this.toModel(user, user);
  }

  async getIdByEmail(email: string): Promise<number> {
    const user = await this.userEntity.findOne({
      select: ['id'],
      where: { email },
    });
    if (!user || !user.id) {
      return null;
    }
    return Number(user.id);
  }

  async areCiOrPhoneOrEmailInUse(
    ci: string,
    phone: string,
    email: string,
    idToIgnore: number | null = null,
  ): Promise<AreCiPhoneMailValid> {
    const query = this.userEntity
      .createQueryBuilder('user')
      .select([
        'pers.ci as "ci"',
        'user.phone as "phone"',
        'user.email as "email"',
      ]);
    if (idToIgnore) {
      query.innerJoin(
        Person,
        'pers',
        `pers.id = user.id and pers.id <> ${idToIgnore}`,
      );
    } else {
      query.innerJoin(Person, 'pers', 'pers.id = user.id');
    }
    const user = await query
      .where('pers.ci = :ci or user.phone = :phone or user.email = :email', {
        ci,
        phone,
        email,
      })
      .getRawOne();

    const result: AreCiPhoneMailValid = {
      ci: null,
      phone: null,
      email: null,
    };
    if (user) {
      if (user.ci === ci) {
        result.ci = `validation.register.CI_IN_USE|{"ci":"${ci}"}`;
      }
      if (user.phone === phone) {
        result.phone = `validation.register.PHONE_IN_USE|{"phone":"${phone}"}`;
      }
      if (user.email === email) {
        result.email = `validation.register.EMAIL_IN_USE|{"email":"${email}"}`;
      }
    }
    return result;
  }

  async isPhoneInUse(phone: string): Promise<string | null> {
    const userPhone = await this.userEntity.findOne({
      select: ['phone'],
      where: {
        phone: phone,
      },
    });
    if (userPhone) {
      return `validation.register.PHONE_IN_USE|{"phone":"${phone}"}`;
    }
    return null;
  }

  async isEmailInUse(email: string): Promise<string> {
    const userEmail = await this.userEntity.findOne({
      select: ['email'],
      where: {
        email: email,
      },
    });
    if (userEmail) {
      return `validation.register.EMAIL_IN_USE|{"email":"${email}"}`;
    }
    return null;
  }

  async updateHashRT(
    id: number,
    app: EAppTypes,
    hashRF: string,
    em: EntityManager = null,
  ): Promise<void> {
    let newHashRT = null;
    const user = await this.getHashRT(id, null);
    if (user && user.hashRefreshToken) {
      try {
        const hash = user.hashRefreshToken;
        if (hashRF === null) {
          if (Object.keys(hash[app]).length === 1) {
            delete hash[app];
          } else {
            delete hash[app];
          }
        } else {
          if (hash[app] === undefined) {
            hash[app] = hashRF;
          } else {
            Object.assign(hash[app], hashRF);
          }
        }
        newHashRT = hash;
      } catch (er) {
        newHashRT = {
          [`${app}`]: hashRF,
        };
      }
    } else {
      newHashRT = {
        [`${app}`]: hashRF,
      };
    }
    const repo = em ? em.getRepository(User) : this.userEntity;
    await repo.update({ id }, { hashRefreshToken: newHashRT });
    await this.cleanCacheData(id);
  }

  async removeRefreshToken(
    id: number,
    app: EAppTypes,
    em: EntityManager = null,
  ): Promise<void> {
    await this.cleanCacheData(id, app);
    await this.updateHashRT(id, app, null, em);
  }

  async updateLastLogin(id: number, app: EAppTypes): Promise<UserModel> {
    const cacheKey = `${this.cacheKey}JWTData:${app}:${id}`;
    const userData = await this.redisService.get<UserModel>(cacheKey);
    if (userData) {
      if (userData.roles && userData.roles.includes(EAppRoles.MEDIC)) {
        await this.redisService.del(cacheKey);
      } else {
        return userData;
      }
    }
    const user = await this.getHashRT(id, app);
    if (!user) {
      return null;
    }
    await this.redisService.set<UserModel>(cacheKey, user, 120);
    await this.userEntity.update(
      { id },
      { updatedAt: () => 'CURRENT_TIMESTAMP' },
    );
    await this.cleanCacheData(id);
    return user;
  }

  async getPhoneOrFail(id: number, em?: EntityManager): Promise<string> {
    const repo = em ? em.getRepository(User) : this.userEntity;
    const user = await repo.findOne({
      where: { id },
      select: ['phone'],
    });
    if (!user) {
      throw new NotFoundException({
        message: [`validation.profile.USER_NOT_FOUND|{"userId":"${id}"}`],
      });
    }
    return user.phone;
  }

  async setEmail(
    id: number,
    email: string | null,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em ? em.getRepository(User) : this.userEntity;
    const result = await repo.update(
      { id },
      { email: email, roles: [EAppRoles.MEDIC] },
    );
    await this.cleanCacheData(id);
    return !!result;
  }

  async setPhone(
    id: number,
    phone: string | null,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em ? em.getRepository(User) : this.userEntity;
    const result = await repo.update({ id }, { phone: phone });
    await this.cleanCacheData(id);
    return !!result;
  }

  async addRole(id: number, role: string, em: EntityManager): Promise<boolean> {
    const repo = em ? em.getRepository(User) : this.userEntity;
    const result = await repo
      .createQueryBuilder()
      .update(User)
      .set({ roles: () => `"roles" || ARRAY['${role}'::roles_enum]` })
      .where('id = :id', { id })
      .execute();
    await this.cleanCacheData(id);
    return result.affected === 1;
  }

  async removeRole(
    id: number,
    role: string,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em ? em.getRepository(User) : this.userEntity;
    const result = await repo
      .createQueryBuilder()
      .update(User)
      .set({ roles: () => `array_remove("roles", '${role}'::roles_enum)` })
      .where('id = :id', { id })
      .execute();
    await this.cleanCacheData(id);
    return result.affected === 1;
  }

  async getMetaAtr<T>(
    id: number,
    atr: EUserMetaAttributes,
    useCache = true,
  ): Promise<T | null> {
    if (EUserMetaAttributes[atr] === undefined) {
      return null;
    }
    let metaCacheKey = null;
    if (useCache) {
      metaCacheKey = `${this.cacheKey}${id}:meta`;
      const metaInCache = await this.redisService.get(metaCacheKey);
      if (metaInCache && metaInCache[atr]) {
        return <T>metaInCache[atr];
      }
    }
    const query = await this.userEntity
      .createQueryBuilder()
      .select(['meta as "meta"']);
    const user = await query.where('id = :id', { id }).getRawOne();
    if (user && user.meta) {
      if (metaCacheKey) {
        await this.redisService.set(metaCacheKey, user.meta, this.cacheTime);
      }
      return user.meta[atr] ? <T>user.meta[atr] : null;
    }
    return null;
  }

  async setMeta(
    id: number,
    metaData: MetaData,
    em: EntityManager = null,
  ): Promise<boolean> {
    const repo = em ? em.getRepository(User) : this.userEntity;
    const userData = await this.getById(id);
    if (userData) {
      let valuesChange = false;
      let meta: MetaData = null;
      if (userData.meta) {
        meta = userData.meta;
        if (
          metaData.defaultLan !== undefined &&
          meta.defaultLan !== metaData.defaultLan
        ) {
          meta.defaultLan = metaData.defaultLan;
          valuesChange = true;
        }
      } else {
        meta = metaData;
        valuesChange = true;
      }

      if (valuesChange) {
        const userMetaUdp = await repo.update({ id }, { meta });

        await this.cleanCacheData(id);
        if (userMetaUdp && userMetaUdp.affected > 0) {
          return true;
        }
      }
    }
    return false;
  }

  usersAreSame(user1: UserModel, user2: UserUpdateModel): boolean {
    const u1DateOfBirth = user1.dateOfBirth
      ? new Date(user1.dateOfBirth)
      : null;
    const sameDateOfBirth =
      (u1DateOfBirth &&
        u1DateOfBirth.toISOString().slice(0, 10) === `${user2.dateOfBirth}`) ||
      user1.dateOfBirth == user2.dateOfBirth;
    return (
      user1.ci === user2.ci &&
      user1.firstName === user2.firstName &&
      user1.middleName === user2.middleName &&
      user1.lastName === user2.lastName &&
      user1.secondLastName === user2.secondLastName &&
      sameDateOfBirth &&
      user1.gender === user2.gender &&
      user1.phone === user2.phone &&
      user1.email === user2.email &&
      user1.medicalSpecialtyId === user2.medicalSpecialtyId
    );
  }

  async delete(userId: number, em: EntityManager): Promise<void> {
    const repo = em ? em.getRepository(User) : this.userEntity;

    await repo
      .createQueryBuilder()
      .delete()
      .from(OperatorsActions)
      .where('operator_id = :userId or to_user_id = :userId', { userId })
      .execute();

    await repo
      .createQueryBuilder()
      .delete()
      .where('id = :userId', { userId })
      .execute();
  }

  private toModelPanel(entity: User, isForDetails = false): UserModel {
    const model: UserModel = new UserModel();

    if (isForDetails) {
      model.ci = entity['ci'];
      model.firstName = entity['firstName'];
      model.middleName = entity['middleName'];
      model.lastName = entity['lastName'];
      model.secondLastName = entity['secondLastName'];
    } else {
      model.id = Number(entity.id);
    }

    model.fullName = entity['fullName'];

    model.dateOfBirth = entity['dateOfBirth'];
    model.gender = entity['gender'];
    model.phone = entity.phone;
    model.email = entity.email;
    model.roles = entity.roles;
    model.medicalSpecialtyId = entity.medicalSpecialtyId;

    if (isForDetails) {
      model.meta = entity.meta;
    }

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;

    return model;
  }

  private toModel(
    entity: User,
    person: PersonModel,
    isForPanel = false,
  ): UserModel {
    const model: UserModel = new UserModel();

    if (!isForPanel) {
      model.id = Number(entity.id);
    }
    model.ci = person.ci;
    model.firstName = person.firstName;
    model.middleName = person.middleName;
    model.lastName = person.lastName;
    model.secondLastName = person.secondLastName;
    model.fullName = person.fullName;
    model.dateOfBirth = person.dateOfBirth;
    model.gender = person.gender;

    model.phone = entity.phone;
    model.email = entity.email;
    model.roles = entity.roles;
    model.medicalSpecialtyId = entity.medicalSpecialtyId;

    model.meta = entity.meta ? <MetaData>entity.meta : null;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;

    return model;
  }

  private toCreate(model: UserModel): User {
    const entity = new User();

    entity.id = model.id;
    entity.hashRefreshToken = {};

    entity.phone = model.phone;
    entity.email = model.email;

    entity.roles = model.roles;
    entity.medicalSpecialtyId = model.medicalSpecialtyId ?? 1;

    return entity;
  }
}
