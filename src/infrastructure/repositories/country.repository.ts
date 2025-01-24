import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CountryCreateModel, CountryModel } from 'src/domain/model/country';
import {
  CountryQueryParams,
  ICountryRepository,
} from 'src/domain/repositories/countryRepository.interface';
import { Repository } from 'typeorm';
import { Country } from '../entities/country.entity';
import { ApiLoggerService } from '../services/logger/logger.service';
import { ApiRedisService } from '../services/redis/redis.service';

@Injectable()
export class DatabaseCountryRepository implements ICountryRepository {
  private readonly cacheKey = 'Repository:Country:';
  private readonly cacheTime = 3600; // 1hora en segs;
  constructor(
    @InjectRepository(Country)
    private readonly countryEntity: Repository<Country>,
    private readonly redisService: ApiRedisService,
    private readonly logger: ApiLoggerService,
  ) { }
  private toCreate(model: CountryCreateModel): Country {
    const entity = new Country();

    entity.id = model.id;
    entity.name = model.name;
    entity.iso2 = model.iso2;
    entity.iso3 = model.iso3;
    entity.countryCode = model.countryCode;
    entity.phoneCode = model.phoneCode;

    return entity;
  }

  async countryExistOrGetError(countryId: number): Promise<string> {
    const country = await this.get(countryId, false);

    if (!country) {
      this.logger.debug('Validating country exist fail', {
        countryId,
        context: 'DatabaseCountryRepository.countryExistOrGetError',
      });
      return `validation.common.COUNTRY_ID_NOT_EXIST|{"countryId":"${countryId}"}`;
    }
    return null;
  }

  async ensureExistOrFail(countryId: number) {
    const countryError = await this.countryExistOrGetError(countryId);
    if (countryError) {
      throw new NotFoundException({
        message: [countryError],
      });
    }
  }

  async get(id: number, failIfNotExist = false): Promise<CountryModel> {
    const country = await this.countryEntity
      .createQueryBuilder('co')
      .select([
        'co.id as "id"',
        'co.name as "name"',
        'co.iso3 as "iso3"',
        'co.iso2 as "iso2"',
        'co.country_code as "countryCode"',
        'co.phone_code as "phoneCode"',
      ])
      .where('co.id = :id', { id })
      .getRawOne();
    if (country) {
      return this.toModel(country);
    }
    if (failIfNotExist) {
      this.logger.debug('Validating country exist fail', {
        countryId: id,
        context: 'DatabaseCountryRepository.countryIdExistOrError',
      });
      throw new NotFoundException({
        message: [
          `validation.common.COUNTRY_ID_NOT_EXIST|{"countryId":"${id}"}`,
        ],
      });
    }
    return null;
  }

  async getIso2ByIdOrFail(countryId: number): Promise<string> {
    const country = await this.get(countryId, true);
    if (!country.iso2) {
      this.logger.warn('{message}', {
        message: `Country repository: Validating country iso2 is set`,
        countryId: countryId,
        context: 'DatabaseCountryRepository.getCountryIso2ByIdOrFail',
      });
      throw new NotFoundException({
        message: [
          `validation.common.COUNTRY_ISO2_NOT_FOUND|{"countryId":"${countryId}"}`,
        ],
      });
    }
    return country.iso2;
  }

  async getIdByIso2OrCode(iso2: string): Promise<number> {
    if (!iso2 || iso2.length === 0) {
      return null;
    }
    const countries = await this.getAll();
    const country =
      countries && countries.length
        ? countries.find(
          (item) =>
            (item.iso2 && item.iso2.toLowerCase() == iso2.toLowerCase()) ||
            (item.countryCode &&
              item.countryCode.toLowerCase() == iso2.toLowerCase()),
        )
        : null;
    if (!country) {
      this.logger.debug('Country by iso2 ({iso2}) not found: CHECK', {
        iso2,
        context: 'DatabaseStateRepository.getIdByIso2orName',
      });
      return null;
    }
    return country.id;
  }

  async getByQuery(query: CountryQueryParams): Promise<CountryModel[]> {
    let countries = await this.getAll();
    if (countries && countries.length) {
      const description = query.description
        ? query.description.trim().toLowerCase()
        : null;
      if (description) {
        countries = countries.filter(
          (item) =>
            item.name.toLowerCase().slice(0, description.length) ===
            description,
        );
      }
      if (query.orderDir === 'DESC') {
        countries = countries.sort((a, b) => {
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
        countries = countries.slice(0, parseInt(query.limit));
      }
      return countries;
    }
    return [];
  }

  async cleanCache(justActive = false) {
    if (justActive) {
      const cacheKey = `${this.cacheKey}Model:Actives`;
      await this.redisService.del(cacheKey);
      return;
    }
    const cacheKey = `${this.cacheKey}Model:All`;
    await this.redisService.del(cacheKey);
  }

  async getAll(refreshMode = false): Promise<CountryModel[]> {
    const cacheKey = `${this.cacheKey}Model:All`;
    if (!refreshMode) {
      const existInCache = await this.redisService.exist(cacheKey);
      if (existInCache) {
        return await this.redisService.get<CountryModel[]>(cacheKey);
      }
    }
    const query = this.countryEntity
      .createQueryBuilder('country')
      .select([
        'country.id as "id"',
        'country.name as "name"',
        'country.iso3 as "iso3"',
        'country.iso2 as "iso2"',
        'country.country_code as "countryCode"',
        'country.phone_code as "phoneCode"',
      ])
      .orderBy('country.name', 'ASC');
    const countries = await query.getRawMany();

    if (countries && countries.length > 0) {
      const data: CountryModel[] = countries.map((obj) => this.toModel(obj));
      await this.redisService.set<CountryModel[]>(
        cacheKey,
        data,
        this.cacheTime,
      );
      return data;
    }
    return null;
  }

  private toModel(entity: Country): CountryModel {
    const model = new CountryModel();

    model.id = Number(entity.id);
    model.name = entity.name;
    model.iso3 = entity.iso3;
    model.iso2 = entity.iso2;
    model.countryCode = entity.countryCode;
    model.phoneCode = entity.phoneCode;
    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;

    return model;
  }

  private toEntity(model: CountryModel): Country {
    const entity = new Country();

    entity.id = model.id;
    entity.name = model.name;
    entity.iso3 = model.iso3;
    entity.iso2 = model.iso2;
    entity.countryCode = model.countryCode;
    entity.phoneCode = model.phoneCode;
    entity.createdAt = model.createdAt;
    entity.updatedAt = model.updatedAt;

    return entity;
  }
}
