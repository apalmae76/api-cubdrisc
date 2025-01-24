import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  MedicalSpecialtyCreateModel,
  MedicalSpecialtyModel,
} from 'src/domain/model/medicalSpecialty';
import {
  IMedicalSpecialtyRepository,
  MedicalSpecialtyQueryParams,
} from 'src/domain/repositories/medicalSpecialtyRepository.interface';
import { Repository } from 'typeorm';
import { MedicalSpecialty } from '../entities/medicalSpecialty.entity';
import { ApiLoggerService } from '../services/logger/logger.service';
import { ApiRedisService } from '../services/redis/redis.service';

@Injectable()
export class DatabaseMedicalSpecialtyRepository
  implements IMedicalSpecialtyRepository {
  private readonly cacheKey = 'Repository:MedicalSpecialty:';
  private readonly cacheTime = 3600; // 1hora en segs;
  private context: string = `${DatabaseMedicalSpecialtyRepository.name}.`;
  constructor(
    @InjectRepository(MedicalSpecialty)
    private readonly medicalSpecialtyEntity: Repository<MedicalSpecialty>,
    private readonly redisService: ApiRedisService,
    private readonly logger: ApiLoggerService,
  ) { }

  private toCreate(model: MedicalSpecialtyCreateModel): MedicalSpecialty {
    const entity = new MedicalSpecialty();

    entity.id = model.id;
    entity.name = model.name;

    return entity;
  }

  async ensureExistOrFail(id: number) {
    const medicalSpecialty = await this.get(id, false);

    if (!medicalSpecialty) {
      this.logger.debug('Validating medical specialty exist fail', {
        id,
        context: `${this.context}ensureExistOrFail`,
      });
      throw new NotFoundException({
        message: [
          `validation.common.MEDICAL_SPECIALTY_NOT_FOUND|{"id":"${id}"}`,
        ],
      });
    }
  }

  async get(
    id: number,
    failIfNotExist = false,
  ): Promise<MedicalSpecialtyModel> {
    const medicalSpecialty = await this.medicalSpecialtyEntity
      .createQueryBuilder('me')
      .select([
        'me.id as "id"',
        'me.name as "name"',
        'me.created_at as "createdAt"',
        'me.updated_at as "updatedAt"',
        'me.deleted_at as "deletedAt"',
      ])
      .where('me.id = :id', { id })
      .getRawOne();
    if (medicalSpecialty) {
      return this.toModel(medicalSpecialty);
    }
    if (failIfNotExist) {
      this.logger.debug('Validating medical apecialty exist fail', {
        id,
        context: `${this.context}get`,
      });
      throw new NotFoundException({
        message: [
          `validation.common.MEDICAL_SPECIALTY_NOT_FOUND|{"id":"${id}"}`,
        ],
      });
    }
    return null;
  }

  async getByQuery(
    query: MedicalSpecialtyQueryParams,
  ): Promise<MedicalSpecialtyModel[]> {
    let medSpecialties = await this.getAll();
    if (medSpecialties && medSpecialties.length) {
      const description = query.name ? query.name.trim().toLowerCase() : null;
      if (description) {
        medSpecialties = medSpecialties.filter(
          (item) =>
            item.name.toLowerCase().slice(0, description.length) ===
            description,
        );
      }
      if (query.orderDir === 'DESC') {
        medSpecialties = medSpecialties.sort((a, b) => {
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
        medSpecialties = medSpecialties.slice(0, parseInt(query.limit));
      }
      return medSpecialties;
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

  async getAll(refreshMode = false): Promise<MedicalSpecialtyModel[]> {
    const cacheKey = `${this.cacheKey}Model:All`;
    if (!refreshMode) {
      const existInCache = await this.redisService.exist(cacheKey);
      if (existInCache) {
        return await this.redisService.get<MedicalSpecialtyModel[]>(cacheKey);
      }
    }
    const query = this.medicalSpecialtyEntity
      .createQueryBuilder('me')
      .select([
        'me.id as "id"',
        'me.name as "name"',
        'me.created_at as "createdAt"',
        'me.updated_at as "updatedAt"',
        'me.deleted_at as "deletedAt"',
      ])
      .orderBy('me.name', 'ASC');
    const countries = await query.getRawMany();

    if (countries && countries.length > 0) {
      const data: MedicalSpecialtyModel[] = countries.map((obj) =>
        this.toModel(obj),
      );
      await this.redisService.set<MedicalSpecialtyModel[]>(
        cacheKey,
        data,
        this.cacheTime,
      );
      return data;
    }
    return null;
  }

  private toModel(entity: MedicalSpecialty): MedicalSpecialtyModel {
    const model = new MedicalSpecialtyModel();

    model.id = Number(entity.id);
    model.name = entity.name;
    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;

    return model;
  }

  private toEntity(model: MedicalSpecialtyModel): MedicalSpecialty {
    const entity = new MedicalSpecialty();

    entity.id = model.id;
    entity.name = model.name;
    entity.createdAt = model.createdAt;
    entity.updatedAt = model.updatedAt;
    entity.deletedAt = model.deletedAt;

    return entity;
  }
}
