import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PatientModel, PatientUpdateModel } from 'src/domain/model/patient';
import { PersonModel } from 'src/domain/model/person';
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
import { DatabasePersonRepository } from './person.repository';

@Injectable()
export class DatabasePatientRepository
  extends BaseRepository
  implements IPatientRepository {
  private readonly cacheKey = 'Repository:Patient:';
  private readonly cacheTime = 15 * 60; // 15 mins
  constructor(
    @InjectRepository(Patient)
    private readonly patientEntity: Repository<Patient>,
    private readonly personRepo: DatabasePersonRepository,
    private readonly redisService: ApiRedisService,
    protected readonly logger: ApiLoggerService,
  ) {
    super(patientEntity, logger);
  }

  async create(
    patient: PatientModel,
    em: EntityManager,
  ): Promise<PatientModel> {
    const person = await this.personRepo.create(patient, em);
    const repo = em ? em.getRepository(Patient) : this.patientEntity;
    const patientEntity = this.toCreate({ ...patient, id: person.id });
    const patientSaved = await repo.save(patientEntity);
    return this.toModel(patientSaved, person);
  }

  async updateIfExistOrFail(
    id: number,
    patient: PatientUpdateModel,
    em: EntityManager,
  ): Promise<boolean> {
    await this.personRepo.updateIfExistOrFail(id, patient, em);
    const repo = em ? em.getRepository(Patient) : this.patientEntity;
    const patientEntity = await repo.findOne({ where: { id: id } });
    if (!patient) {
      throw new NotFoundException({
        message: [`validation.patient.PATIENT_NOT_FOUND|{"id":"${id}"}`],
      });
    }
    patientEntity.phone = patient.phone;
    patientEntity.email = patient.email;
    patientEntity.diagnosed = patient.diagnosed;

    await repo.save(patientEntity);
    await this.cleanCacheData(id);
    return true;
  }

  async softDelete(id: number, em: EntityManager = null): Promise<boolean> {
    const repo = em ? em.getRepository(Patient) : this.patientEntity;

    await this.cleanCacheData(id);
    const { affected } = await repo
      .createQueryBuilder()
      .update(Patient)
      .set({ deletedAt: new Date() })
      .where('id = :id and deleted_at is null', { id })
      .execute();
    if (!affected) {
      const rowIsDeleted = await this.isRowDeleted(id);
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

  private async isRowDeleted(id: number): Promise<boolean> {
    const row = await this.patientEntity
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

  private async cleanCacheData(id: number) {
    const cacheKey = `${this.cacheKey}${id}`;
    await this.redisService.del(cacheKey);
  }

  getBasicQuery() {
    return this.patientEntity
      .createQueryBuilder('pa')
      .select([
        'pa.id as "id"',
        'pers.ci as "ci"',
        'pers.first_name as "firstName"',
        'pers.middle_name as "middleName"',
        'pers.last_name as "lastName"',
        'pers.second_last_name as "secondLastName"',
        'pers.full_name as "fullName"',
        'pers.date_of_birth as "dateOfBirth"',
        'pers.gender as "gender"',
        'pa.phone as "phone"',
        'pa.email as "email"',
        'pa.diagnosed as "diagnosed"',
        'pa.created_at as "createdAt"',
        'pa.updated_at as "updatedAt"',
        'pa.deleted_at as "deletedAt"',
      ])
      .withDeleted()
      .innerJoin(Person, 'pers', 'pers.id = user.id')
      .withDeleted();
  }

  async getByIdForPanel(id: number): Promise<PatientModel> {
    const query = this.getBasicQuery();
    query.where('pa.id = :id', { id });
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

  async ensureExistOrFail(id: number) {
    await this.getByIdOrFail(id);
  }

  async getByIdOrFail(id: number): Promise<PatientModel> {
    const patient = await this.getById(id);
    if (!patient) {
      throw new NotFoundException({
        message: [`validation.patient.PATIENT_NOT_FOUND|{"id":"${id}"}`],
      });
    }
    return patient;
  }

  async getById(id: number, useCache = true): Promise<PatientModel> {
    let cacheKey = null;
    let patientData: PatientModel = null;
    if (useCache) {
      cacheKey = `${this.cacheKey}${id}`;
      patientData = await this.redisService.get<PatientModel>(cacheKey);
      if (patientData) {
        return patientData;
      }
    }
    const query = await this.getBasicQuery();
    const patient = await query.where('id = :id', { id }).getRawOne();
    if (!patient) {
      return null;
    }
    patientData = this.toModel(patient, patient, true);
    if (cacheKey) {
      await this.redisService.set<PatientModel>(
        cacheKey,
        patientData,
        this.cacheTime,
      );
    }
    return patientData;
  }

  async setEmail(
    id: number,
    email: string | null,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em ? em.getRepository(Patient) : this.patientEntity;
    const result = await repo.update({ id }, { email });
    await this.cleanCacheData(id);
    return !!result;
  }

  async setPhone(
    id: number,
    phone: string | null,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em ? em.getRepository(Patient) : this.patientEntity;
    const result = await repo.update({ id }, { phone: phone });
    await this.cleanCacheData(id);
    return !!result;
  }

  patientsAreSame(
    patient1: PatientModel,
    patient2: PatientUpdateModel,
  ): boolean {
    const u1DateOfBirth = patient1.dateOfBirth
      ? new Date(patient1.dateOfBirth)
      : null;
    const sameDateOfBirth =
      (u1DateOfBirth &&
        u1DateOfBirth.toISOString().slice(0, 10) ===
        `${patient2.dateOfBirth}`) ||
      patient1.dateOfBirth == patient2.dateOfBirth;
    return (
      patient1.ci === patient2.ci &&
      patient1.firstName === patient2.firstName &&
      patient1.middleName === patient2.middleName &&
      patient1.lastName === patient2.lastName &&
      patient1.secondLastName === patient2.secondLastName &&
      sameDateOfBirth &&
      patient1.gender === patient2.gender &&
      patient1.phone === patient2.phone &&
      patient1.email === patient2.email &&
      patient1.diagnosed === patient2.diagnosed
    );
  }

  private toModelPanel(entity: Patient, isForDetails = false): PatientModel {
    const model: PatientModel = new PatientModel();

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
    model.diagnosed = entity.diagnosed;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;

    return model;
  }

  private toModel(
    entity: Patient,
    person: PersonModel,
    isForPanel = false,
  ): PatientModel {
    const model: PatientModel = new PatientModel();

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
    model.diagnosed = entity.diagnosed;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;

    return model;
  }

  private toCreate(model: PatientModel): Patient {
    const entity = new Patient();

    entity.id = model.id;
    entity.phone = model.phone;
    entity.email = model.email;
    entity.diagnosed = model.diagnosed;

    return entity;
  }
}
