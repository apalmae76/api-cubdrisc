import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  UserPhonesCreateModel,
  UserPhonesModel,
  UserPhonesPanelModel,
} from 'src/domain/model/phone';
import { IUserPhoneRepository } from 'src/domain/repositories/phoneRepository.interface';
import { EntityManager, Repository } from 'typeorm';
import { GetGenericAllDto } from '../common/dtos/genericRepo-dto.class';
import { PageDto } from '../common/dtos/page.dto';
import { PageMetaDto } from '../common/dtos/pageMeta.dto';
import { UserPhones } from '../entities/phone.entity';
import { IApiLogger } from '../services/logger/logger.interface';
import { API_LOGGER_KEY } from '../services/logger/logger.module';
import { REDIS_SERVICE_KEY } from '../services/redis/redis.module';
import { ApiRedisService } from '../services/redis/redis.service';
import { BaseRepository } from './base.repository';

@Injectable()
export class DatabasePhoneRepository
  extends BaseRepository
  implements IUserPhoneRepository {
  private readonly cacheKey = 'Repository:UserPhones:';
  private readonly cacheTime = 30 * 60; // 30mins cache
  constructor(
    @InjectRepository(UserPhones)
    private readonly userPhonesEntity: Repository<UserPhones>,
    @Inject(REDIS_SERVICE_KEY) private readonly redisService: ApiRedisService,
    @Inject(API_LOGGER_KEY) protected readonly logger: IApiLogger,
  ) {
    super(userPhonesEntity, logger);
  }

  async create(
    phoneData: UserPhonesCreateModel,
    em: EntityManager,
  ): Promise<UserPhonesModel> {
    const repo = em ? em.getRepository(UserPhones) : this.userPhonesEntity;
    const isPhoneRegisterByUser = await this.isRegisteredByUserId(
      phoneData.userId,
      phoneData.phone,
      em,
    );
    if (!isPhoneRegisterByUser) {
      const phoneEntity = this.toEntityCreate(phoneData);
      const phone = await repo.save(phoneEntity);
      await this.cleanCache(phoneData.userId);
      return this.toModel(phone);
    }
  }

  async getByUserId(userId: number, useCache = true): Promise<UserPhonesModel> {
    const cacheKey = `${this.cacheKey}${userId}`;
    let userPhone: UserPhonesModel = null;
    if (useCache) {
      const userPhone = await this.redisService.get<UserPhonesModel>(cacheKey);
      if (userPhone) {
        return userPhone;
      }
    }
    userPhone = await this.userPhonesEntity
      .createQueryBuilder()
      .select([
        'id',
        'phone',
        'country_iso2 as "countryIso2"',
        'created_at as "createdAt"',
      ])
      .where('user_id = :userId', { userId })
      .orderBy('created_at', 'DESC')
      .getRawOne();
    if (!userPhone) {
      return null;
    }
    if (useCache) {
      await this.redisService.set<UserPhonesModel>(
        cacheKey,
        userPhone,
        this.cacheTime,
      );
    }
    return userPhone;
  }

  async cleanCache(id: number) {
    const cacheKey = `${this.cacheKey}${id}`;
    await this.redisService.del(cacheKey);
  }

  async isRegisteredByUserId(
    userId: number,
    phone: string,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em ? em.getRepository(UserPhones) : this.userPhonesEntity;
    const userPhone = await repo
      .createQueryBuilder()
      .select(['id'])
      .where('user_id = :userId and phone = :phone', { userId, phone })
      .getRawOne();
    return !!userPhone;
  }

  async getByQuery(
    queryDto: GetGenericAllDto,
  ): Promise<PageDto<UserPhonesPanelModel>> {
    const queryCount = null;
    const queryList = this.userPhonesEntity
      .createQueryBuilder('phones')
      .select([
        'phones.id as "id"',
        'phones.user_id as "userId"',
        'phones.phone as "phone"',
        'phones.national_format as "nationalFormat"',
        'phones.country_iso2 as "countryIso2"',
        'phones.mobile_country_code as "mobileCountryCode"',
        'phones.mobile_network_code as "mobileNetworkCode"',
        'phones.carrier_name as "carrierName"',
        'phones.created_at as "createdAt"',
      ]);

    const data = await super.getByQueryBase<UserPhones, true>({
      queryDto,
      alias: 'phones',
      queryCount,
      queryList,
      hasUserName: true,
    });

    const phones = data.entities.map((phone) => this.toModelPanel(phone));

    const pageMetaDto = new PageMetaDto({
      total: data.itemCount,
      pageOptionsDto: queryDto,
      itemPageCount: phones.length,
    });

    return new PageDto(phones, pageMetaDto);
  }

  private toModelPanel(entity: UserPhones): UserPhonesPanelModel {
    const model = new UserPhonesPanelModel();

    model.id = Number(entity.id);
    model.user = {
      id: Number(entity.userId),
      name: entity['user.name'],
    };

    model.phone = entity.phone;
    model.nationalFormat = entity.nationalFormat;
    model.countryIso2 = entity.countryIso2;
    model.carrierName = entity.carrierName;
    model.mobileCountryCode = entity.mobileCountryCode;
    model.mobileNetworkCode = entity.mobileNetworkCode;

    model.createdAt = entity.createdAt;

    return model;
  }

  private toModel(entity: UserPhones): UserPhonesModel {
    const model = new UserPhonesModel();

    model.userId = Number(entity.userId);
    model.id = Number(entity.id);
    model.phone = entity.phone;
    model.createdAt = entity.createdAt;

    return model;
  }

  private toEntityCreate(model: UserPhonesCreateModel): UserPhones {
    const entity = new UserPhones();

    entity.userId = model.userId;
    entity.phone = model.phone;
    entity.nationalFormat = model.nationalFormat;
    entity.countryIso2 = model.countryIso2;
    entity.mobileCountryCode = model.mobileCountryCode;
    entity.mobileNetworkCode = model.mobileNetworkCode;
    entity.carrierName = model.carrierName.slice(0, 199);

    return entity;
  }
}
