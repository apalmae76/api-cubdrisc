import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PatientCreateModel,
  PatientKeyModel,
  PatientModel,
  PatientPanelModel,
} from 'src/domain/model/patient';
import { IPatientRepository } from 'src/domain/repositories/patientRepository.interface';
import { EntityManager, Repository } from 'typeorm';
import { GetGenericAllDto } from '../common/dtos/genericRepo-dto.class';
import { PageDto } from '../common/dtos/page.dto';
import { PageMetaDto } from '../common/dtos/pageMeta.dto';
import { MedicalSpecialty } from '../entities/medical-specialty.entity';
import { Patient } from '../entities/patient.entity';
import { Person } from '../entities/person.entity';
import { IApiLogger } from '../services/logger/logger.interface';
import { API_LOGGER_KEY } from '../services/logger/logger.module';
import { REDIS_SERVICE_KEY } from '../services/redis/redis.module';
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
    @Inject(REDIS_SERVICE_KEY) private readonly redisService: ApiRedisService,
    @Inject(API_LOGGER_KEY) protected readonly logger: IApiLogger,
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

  async delete(
    patient: PatientKeyModel,
    em: EntityManager | null = null,
  ): Promise<boolean> {
    const repo = em ? em.getRepository(Patient) : this.patientEntity;

    const { affected } = await repo.delete(patient);

    if (affected > 0) {
      await this.cleanCacheData(
        patient.personId,
        patient.surveyId,
        patient.personSurveyId,
      );
      return true;
    } else {
      const rowIsDeleted = await this.isRowDeleted(patient);
      if (rowIsDeleted === null) {
        this.logger.warn(
          `Patient repository, delete: Sended id does not exist `,
          {
            affected,
            rowIsDeleted: rowIsDeleted ? rowIsDeleted : 'NULL',
            context: `${DatabasePatientRepository.name}.delete`,
          },
        );
      }
      return false;
    }
  }

  private async isRowDeleted(patient: PatientKeyModel): Promise<boolean> {
    const row = await this.getById(
      patient.personId,
      patient.surveyId,
      patient.personSurveyId,
    );
    if (row) {
      return true;
    }
    return false;
  }

  private async cleanCacheData(
    personId: number,
    surveyId: number,
    personSurveyId: number,
  ) {
    const cacheKey = `${this.cacheKey}${personId}${surveyId}${personSurveyId}`;
    await this.redisService.del(cacheKey);
  }

  private getBasicQuery(isForPanel = false) {
    const query = this.patientEntity
      .createQueryBuilder('pa')
      .select([
        'pa.person_id as "personId"',
        'pa.survey_id as "surveyId"',
        'pa.person_survey_id as "personSurveyId"',
        'pa.medic_id as "medicId"',
        'pa.medical_specialty_id as "medicalSpecialtyId"',
        'pa.created_at as "createdAt"',
      ]);
    if (isForPanel) {
      query
        .innerJoin(Person, 'pepa', 'pepa.id = pa.person_id')
        .withDeleted()
        .innerJoin(Person, 'pe', 'pe.id = pa.medic_id')
        .withDeleted()
        .innerJoin(MedicalSpecialty, 'ms', 'ms.id = pa.medical_specialty_id')
        .withDeleted()
        .addSelect('pepa.fullName', 'personFullName')
        .addSelect('pe.fullName', 'medicFullName')
        .addSelect('ms.name', 'medicalSpecialtyName');
    }
    return query;
  }

  async getByIdForPanel(
    personId: number,
    surveyId: number,
    personSurveyId: number,
  ): Promise<PatientPanelModel> {
    const query = this.getBasicQuery(true);
    query.where(
      'pa.person_id = :personId and pa.survey_id = :surveyId and pa.person_survey_id = :personSurveyId',
      { personId, surveyId, personSurveyId },
    );
    const patient = await query.getRawOne();
    if (!patient) {
      return null;
    }
    return this.toModelPanel(patient, true);
  }

  async getByQuery(queryDto: GetGenericAllDto): Promise<PageDto<PatientModel>> {
    const queryList = this.getBasicQuery();

    const query = await super.getByQueryBase<Patient>({
      queryDto,
      alias: 'pa',
      queryList,
    });

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

  async ensureExistOrFail(
    personId: number,
    surveyId: number,
    personSurveyId: number,
  ) {
    await this.getByIdOrFail(personId, surveyId, personSurveyId);
  }

  async getByIdOrFail(
    personId: number,
    surveyId: number,
    personSurveyId: number,
  ): Promise<PatientModel> {
    const patient = await this.getById(personId, surveyId, personSurveyId);
    if (!patient) {
      throw new NotFoundException({
        message: [`validation.patient.NOT_FOUND|{"personId":"${personId}"}`],
      });
    }
    return patient;
  }

  async getById(
    personId: number,
    surveyId: number,
    personSurveyId: number,
    useCache = true,
  ): Promise<PatientModel> {
    let cacheKey = null;
    let patientData: PatientModel | null = null;
    if (useCache) {
      cacheKey = `${this.cacheKey}${personId}${surveyId}${personSurveyId}`;
      patientData = await this.redisService.get<PatientModel>(cacheKey);
      if (patientData) {
        return patientData;
      }
    }
    const query = await this.getBasicQuery();
    const patient = await query
      .where(
        'pa.person_id = :personId and pa.survey_id = :surveyId and pa.person_survey_id = :personSurveyId',
        { personId, surveyId, personSurveyId },
      )
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

  private toModelPanel(
    entity: Patient,
    isForDetails = false,
  ): PatientPanelModel {
    const model: PatientPanelModel = new PatientPanelModel();

    if (!isForDetails) {
      model.personId = Number(entity.personId);
      model.surveyId = Number(entity.surveyId);
      model.personSurveyId = Number(entity.personSurveyId);
    }

    model.personFullName = entity['personFullName'];
    model.medicId = entity.medicId;
    model.medicFullName = entity['medicFullName'];
    model.medicalSpecialtyId = entity.medicalSpecialtyId;
    model.medicalSpecialtyName = entity['medicalSpecialtyName'];

    model.createdAt = entity.createdAt;

    return model;
  }

  private toModel(entity: Patient, isForPanel = false): PatientModel {
    const model: PatientModel = new PatientModel();

    if (!isForPanel) {
      model.personId = Number(entity.personId);
      model.surveyId = Number(entity.surveyId);
      model.personSurveyId = Number(entity.personSurveyId);
    }

    model.medicId = entity.medicId;
    model.medicalSpecialtyId = entity.medicalSpecialtyId;

    model.createdAt = entity.createdAt;

    return model;
  }

  private toCreate(model: PatientCreateModel): Patient {
    const entity = new Patient();

    entity.personId = model.personId;
    entity.surveyId = model.surveyId;
    entity.personSurveyId = model.personSurveyId;
    entity.medicId = model.medicId;
    entity.medicalSpecialtyId = model.medicalSpecialtyId;

    return entity;
  }
}
