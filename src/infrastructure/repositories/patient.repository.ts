import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PatientCreateModel,
  PatientModel,
  PatientUpdateModel,
} from 'src/domain/model/patient';
import { IPatientRepository } from 'src/domain/repositories/patientRepository.interface';
import { EntityManager, Repository } from 'typeorm';
import { GetGenericAllDto } from '../common/dtos/genericRepo-dto.class';
import { PageDto } from '../common/dtos/page.dto';
import { PageMetaDto } from '../common/dtos/pageMeta.dto';
import { Patient } from '../entities/patient.entity';
import { Person } from '../entities/person.entity';
import { ApiLoggerService } from '../services/logger/logger.service';
import { ApiRedisService } from '../services/redis/redis.service';
import { BaseRepository } from './base.repository';

@Injectable()
export class DatabasePatientRepository
  extends BaseRepository
  implements IPatientRepository {
  private readonly cacheKey = 'Repository:Patient:';
  private readonly cacheTime = 15 * 60; // 15 mins
  constructor(
    @InjectRepository(Patient)
    private readonly patientEntity: Repository<Patient>,
    private readonly redisService: ApiRedisService,
    protected readonly logger: ApiLoggerService,
  ) {
    super(patientEntity, logger);
  }

  async create(
    patient: PatientCreateModel,
    em: EntityManager,
  ): Promise<PatientModel> {
    const repo = em ? em.getRepository(Patient) : this.patientEntity;
    const patientEntity = this.toCreate(patient);
    const patientSaved = await repo.save(patientEntity);
    return this.toModel(patientSaved);
  }

  async update(
    personId: number,
    patient: PatientUpdateModel,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em ? em.getRepository(Patient) : this.patientEntity;
    await repo.update({ personId }, patient);
    await this.cleanCacheData(personId);
    return true;
  }

  async softDelete(
    personId: number,
    em: EntityManager = null,
  ): Promise<boolean> {
    const repo = em ? em.getRepository(Patient) : this.patientEntity;

    await this.cleanCacheData(personId);
    const { affected } = await repo
      .createQueryBuilder()
      .update(Patient)
      .set({ deletedAt: new Date() })
      .where('person_id = :personId and deleted_at is null', { personId })
      .execute();
    if (!affected) {
      const rowIsDeleted = await this.isRowDeleted(personId);
      if (rowIsDeleted === null) {
        this.logger.warn(
          `Patient repository, soft delete: Sended id does not exist `,
          {
            affected,
            rowIsDeleted: rowIsDeleted ? rowIsDeleted : 'NULL',
            context: `${DatabasePatientRepository.name}.softDelete`,
          },
        );
      }
    }
    return affected > 0;
  }

  private async isRowDeleted(personId: number): Promise<boolean> {
    const row = await this.patientEntity
      .createQueryBuilder()
      .select(['deleted_at as "deletedAt"'])
      .withDeleted()
      .where('person_id = :personId', { id: personId })
      .getRawOne();
    if (row) {
      return row.deletedAt !== null;
    }
    return null;
  }

  private async cleanCacheData(personId: number) {
    const cacheKey = `${this.cacheKey}${personId}`;
    await this.redisService.del(cacheKey);
  }

  private getBasicQuery() {
    return this.patientEntity
      .createQueryBuilder('pa')
      .select([
        'pa.person_id as "personId"',
        'pa.diagnosed as "diagnosed"',
        'pa.created_at as "createdAt"',
        'pa.updated_at as "updatedAt"',
        'pa.deleted_at as "deletedAt"',
      ])
      .withDeleted()
      .innerJoin(Person, 'pers', 'pers.id = user.id')
      .withDeleted();
  }

  async getByIdForPanel(personId: number): Promise<PatientModel> {
    const query = this.getBasicQuery();
    query.where('pa.person_id = :personId', { id: personId });
    const patient = await query.getRawOne();
    if (!patient) {
      return null;
    }
    return this.toModelPanel(patient, true);
  }

  async getByQuery(queryDto: GetGenericAllDto): Promise<PageDto<PatientModel>> {
    const queryList = this.getBasicQuery();

    const query = await super.getByQueryBase<Patient>(
      queryDto,
      'pa',
      null,
      queryList,
      false,
    );

    const patients = query.entities.map((patient) =>
      this.toModelPanel(patient),
    );

    const pageMetaDto = new PageMetaDto({
      total: query.itemCount,
      pageOptionsDto: queryDto,
      itemPageCount: patients.length,
    });

    return new PageDto(patients, pageMetaDto);
  }

  async ensureExistOrFail(personId: number) {
    await this.getByIdOrFail(personId);
  }

  async getByIdOrFail(personId: number): Promise<PatientModel> {
    const patient = await this.getById(personId);
    if (!patient) {
      throw new NotFoundException({
        message: [`validation.patient.NOT_FOUND|{"personId":"${personId}"}`],
      });
    }
    return patient;
  }

  async getById(personId: number, useCache = true): Promise<PatientModel> {
    let cacheKey = null;
    let patientData: PatientModel = null;
    if (useCache) {
      cacheKey = `${this.cacheKey}${personId}`;
      patientData = await this.redisService.get<PatientModel>(cacheKey);
      if (patientData) {
        return patientData;
      }
    }
    const query = await this.getBasicQuery();
    const patient = await query
      .where('person_id = :personId', { personId })
      .getRawOne();
    if (!patient) {
      return null;
    }
    patientData = this.toModel(patient, true);
    if (cacheKey) {
      await this.redisService.set<PatientModel>(
        cacheKey,
        patientData,
        this.cacheTime,
      );
    }
    return patientData;
  }

  private toModelPanel(entity: Patient, isForDetails = false): PatientModel {
    const model: PatientModel = new PatientModel();

    if (!isForDetails) {
      model.personId = Number(entity.personId);
    }
    model.diagnosed = entity.diagnosed;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;

    return model;
  }

  private toModel(entity: Patient, isForPanel = false): PatientModel {
    const model: PatientModel = new PatientModel();

    if (!isForPanel) {
      model.personId = Number(entity.personId);
    }

    model.diagnosed = entity.diagnosed;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;

    return model;
  }

  private toCreate(model: PatientModel): Patient {
    const entity = new Patient();

    entity.personId = model.personId;
    entity.diagnosed = model.diagnosed;

    return entity;
  }
}
