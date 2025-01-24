import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CityQueryParams,
  ICityRepository,
} from 'src/domain/repositories/cityRepository.interface';
import { Repository } from 'typeorm';
import {
  CityCreateModel,
  CityModel
} from '../../domain/model/city';

import { City } from '../entities/city.entity';
import { ApiLoggerService } from '../services/logger/logger.service';
import { ApiRedisService } from '../services/redis/redis.service';

export enum ERefreshMode {
  BOTH = 'both',
  CACHE = 'cache',
  DB = 'db',
}

export type GetCityStateData = {
  city: string;
  cityId: number;
  state: string;
  stateId: number;
};
@Injectable()
export class DatabaseCityRepository implements ICityRepository {
  private readonly cacheKey = 'Repository:City:';
  private readonly cacheTime = 4 * 60 * 60; // 2 hours
  constructor(
    @InjectRepository(City)
    private readonly cityEntity: Repository<City>,
    private readonly redisService: ApiRedisService,
    private readonly logger: ApiLoggerService,
  ) { }

  async getAllFromCountry(countryId: number): Promise<CityModel[]> {
    const key = `${this.cacheKey}ALL:country:${countryId}`;

    const cached = await this.redisService.get<CityModel[] | undefined>(key);
    if (cached) {
      return cached;
    }
    const cities = await this.cityEntity.find({
      where: {
        countryId,
      },
    });

    const data = cities.map((city) => this.toModel(city));
    await this.redisService.set(key, data, 3600);
    return data;
  }

  private toCreate(model: CityCreateModel): City {
    const entity = new City();

    entity.name = model.name;
    entity.countryId = model.countryId;
    entity.stateId = model.stateId;

    return entity;
  }

  async cityExistOrGetError(
    countryId: number,
    stateId: number,
    cityId: number,
    refreshMode = ERefreshMode.BOTH,
  ): Promise<string> {
    const city = await this.get(countryId, stateId, cityId, false, refreshMode);
    if (!city) {
      this.logger.debug('Validating city exist fail', {
        countryId,
        stateId,
        cityId,
        context: 'DatabaseCityRepository.cityExistOrGetError',
      });
      return `validation.common.CITY_ID_NOT_EXIST|{"cityId":"${cityId}"}`;
    }
    return null;
  }

  async getCityByIdOrError(cityId: number): Promise<CityModel> {
    const key = `${this.cacheKey}${cityId}`;
    const notFoundCacheValue: string = 'not found';
    const cached = await this.redisService.get<CityModel | string | undefined>(
      key,
    );
    if (cached && typeof cached !== 'string') {
      return cached;
    }
    const city = await this.cityEntity.findOne({ where: { id: cityId } });
    if (!city) {
      this.logger.warn('City with id {cityId} not found!', {
        cityId,
        context: 'DatabaseCityRepository.getCityByIdOrError',
      });
      await this.redisService.set(key, notFoundCacheValue, 60);
      throw new BadRequestException({
        message: [`validation.common.CITY_NOT_FOUND|{"cityId":"${cityId}"}`],
      });
    }
    const model = this.toModel(city);
    await this.redisService.set(key, model, this.cacheTime);
    return model;
  }

  async ensureExistOrFail(
    countryId: number,
    stateId: number,
    cityId: number,
    refreshMode = ERefreshMode.BOTH,
  ) {
    const cityError = await this.cityExistOrGetError(
      countryId,
      stateId,
      cityId,
      refreshMode,
    );
    if (cityError) {
      throw new BadRequestException({
        message: [cityError],
      });
    }
  }

  async get(
    countryId: number,
    stateId: number,
    cityId: number,
    failIfNotExist = false,
    refreshMode = ERefreshMode.BOTH,
  ): Promise<CityModel> {
    const cities = await this.getAll(countryId, stateId, refreshMode);
    const city =
      cities && cities.length ? cities.find((item) => item.id == cityId) : null;
    if (failIfNotExist && !city) {
      throw new BadRequestException({
        message: [`validation.common.CITY_ID_NOT_EXIST|{"cityId":"${cityId}"}`],
      });
    }
    return city;
  }

  async getIdByName(
    countryId: number,
    stateId: number,
    name: string,
  ): Promise<number> {
    if (!countryId || !stateId || !name || name.length === 0) {
      return null;
    }
    const cities = await this.getAll(countryId, stateId);
    const city =
      cities && cities.length
        ? cities.find(
          (item) =>
            item.name && item.name.toLowerCase() == name.toLowerCase(),
        )
        : null;
    if (!city) {
      return null;
    }
    return city.id;
  }

  async getByQuery(query: CityQueryParams): Promise<CityModel[]> {
    let cities = await this.getAll(
      parseInt(query.countryId),
      parseInt(query.stateId),
    );
    if (cities && cities.length) {
      const description = query.description
        ? query.description.trim().toLowerCase()
        : null;
      if (description) {
        cities = cities.filter(
          (item) =>
            item.name.toLowerCase().slice(0, description.length) ===
            description,
        );
      }
      if (query.orderDir === 'DESC') {
        cities = cities.sort((a, b) => {
          if (a.name < b.name) {
            return 1;
          }
          if (a.name > b.name) {
            return -1;
          }
          return 0;
        });
      }
      if (query.limit) {
        cities = cities.slice(0, parseInt(query.limit));
      }
      return cities;
    }
    return [];
  }

  async getAll(
    countryId: number,
    stateId: number,
    refreshMode = ERefreshMode.BOTH,
  ): Promise<CityModel[]> {
    const cacheKey = `${this.cacheKey}${countryId}:${stateId}_Model`;
    if (
      refreshMode === ERefreshMode.BOTH ||
      refreshMode === ERefreshMode.CACHE
    ) {
      const existInCache = await this.redisService.exist(cacheKey);
      if (existInCache) {
        return await this.redisService.get<CityModel[]>(cacheKey);
      }
      if (refreshMode === ERefreshMode.CACHE) {
        return null;
      }
    }

    const cities = await this.cityEntity
      .createQueryBuilder('city')
      .select(['city.id as "id"', 'city.name as "name"'])
      .where('city.country_id = :countryId and city.state_id = :stateId', {
        countryId,
        stateId,
      })
      .orderBy('city.name', 'ASC')
      .getRawMany();
    if (cities.length > 0) {
      const data: CityModel[] = cities.map((obj) => this.toModel(obj));
      await this.redisService.set<CityModel[]>(cacheKey, data, this.cacheTime);
      return data;
    } else {
      await this.redisService.del(cacheKey);
    }
    return null;
  }

  async getCityNameOrFail(
    countryId: number,
    stateId: number,
    cityId: number,
  ): Promise<string> {
    const city = await this.get(countryId, stateId, cityId, true);
    return city ? city.name : null;
  }

  async getCityStateId(cityId: number): Promise<number> {
    const city = await this.getCityState(cityId);
    return city ? Number(city.stateId) : null;
  }

  async getCityStateName(cityId: number): Promise<string> {
    const city = await this.getCityState(cityId);
    return city ? city.state : '';
  }

  async getCityStateNameAndCityNameByCityIdOrFail(
    id: number,
  ): Promise<GetCityStateData> {
    const city = await this.getCityState(id);
    if (!city) {
      throw new BadRequestException({
        message: [`validation.common.CITY_ID_NOT_EXIST|{"cityId":"${id}"}`],
      });
    }
    return city;
  }

  async getCityState(id: number): Promise<GetCityStateData> {
    const key = `${this.cacheKey}state_data:${id}`;
    const cached = await this.redisService.get<GetCityStateData | undefined>(
      key,
    );
    if (cached) {
      return cached;
    }
    const city = await this.cityEntity.findOne({
      where: {
        id,
      },
      relations: {
        state: true,
      },
    });
    if (!city) {
      // save 1 min empty cache
      await this.redisService.set<GetCityStateData>(key, null, 60);
      return null;
    }
    const data: GetCityStateData = {
      city: city.name,
      cityId: Number(city.id),
      state: city?.state?.name,
      stateId: Number(city?.stateId),
    };
    await this.redisService.set<GetCityStateData>(key, data, this.cacheTime);
    return data;
  }

  private toModel(entity: City): CityModel {
    const model = new CityModel();

    model.id = Number(entity.id);
    model.name = entity.name;
    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;

    return model;
  }

  private toEntity(model: CityModel): City {
    const entity = new City();

    entity.id = model.id;
    entity.name = model.name;
    entity.createdAt = model.createdAt;
    entity.updatedAt = model.updatedAt;

    return entity;
  }
}
