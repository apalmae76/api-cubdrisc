import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PatientSurveyCreateModel,
  PatientSurveyModel,
} from 'src/domain/model/patientSurvey';
import { IPatientSurveyRepository } from 'src/domain/repositories/patientSurveyRepository.interface';
import { EntityManager, Repository } from 'typeorm';
import { GetGenericAllDto } from '../common/dtos/genericRepo-dto.class';
import { PageDto } from '../common/dtos/page.dto';
import { PageMetaDto } from '../common/dtos/pageMeta.dto';
import { PatientSurvey } from '../entities/patientSurvey.entity';
import { ApiLoggerService } from '../services/logger/logger.service';
import { ApiRedisService } from '../services/redis/redis.service';
import { BaseRepository } from './base.repository';
@Injectable()
export class DatabasePatientSurveyRepository
  extends BaseRepository
  implements IPatientSurveyRepository {
  private readonly cacheKey = 'Repository:PatientSurvey:';
  private readonly cacheTime = 15 * 60; // 15 mins
  constructor(
    @InjectRepository(PatientSurvey)
    private readonly patientSurveyEntity: Repository<PatientSurvey>,
    private readonly redisService: ApiRedisService,
    protected readonly logger: ApiLoggerService,
  ) {
    super(patientSurveyEntity, logger);
  }

  async create(
    data: PatientSurveyCreateModel,
    em: EntityManager,
  ): Promise<PatientSurveyModel> {
    const repo = em
      ? em.getRepository(PatientSurvey)
      : this.patientSurveyEntity;
    const entity = this.toCreate(data);
    const dataSaved = await repo.save(entity);
    this.cleanCacheData(data);
    return this.toModel(dataSaved);
  }

  private toCreate(model: PatientSurveyCreateModel): PatientSurvey {
    const entity = new PatientSurvey();

    entity.patientId = model.patientId;
    entity.surveyId = model.surveyId;

    entity.age = model.age;
    entity.totalScore = model.totalScore;
    entity.waistPerimeter = model.waistPerimeter;
    entity.weight = model.weight;
    entity.size = model.size;
    entity.imcc = model.imcc;
    entity.estimatedRisk = model.estimatedRisk;

    return entity;
  }

  private async cleanCacheData({
    patientId,
    surveyId,
  }: {
    patientId: number;
    surveyId: number;
  }) {
    const cacheKey = `${this.cacheKey}${patientId}:${surveyId}`;
    await this.redisService.del(cacheKey);
  }

  private getBasicQuery() {
    return this.patientSurveyEntity
      .createQueryBuilder('ps')
      .select([
        'ps.patient_id as "patientId"',
        'ps.survey_id as "surveyId"',
        'ps.age as "age"',
        'ps.total_score as "totalScore"',
        'ps.waist_perimeter as "waistPerimeter"',
        'ps.weight as "weight"',
        'ps.size as "size"',
        'ps.imcc as "imcc"',
        'ps.estimated_risk as "estimatedRisk"',
        'ps.created_at as "createdAt"',
      ])
      .withDeleted();
  }

  async getByIdForPanel(
    patientId: number,
    surveyId: number,
  ): Promise<PatientSurveyModel> {
    const query = this.getBasicQuery();
    query.where(`patientId = :patientId and surveyId = :surveyId`, {
      patientId,
      surveyId,
    });
    const survey = await query.getRawOne();
    if (!survey) {
      return null;
    }
    return this.toModelPanel(survey);
  }

  async getByQuery(
    queryDto: GetGenericAllDto,
  ): Promise<PageDto<PatientSurveyModel>> {
    const queryList = this.getBasicQuery();

    const query = await super.getByQueryBase<PatientSurvey>(
      queryDto,
      'ps',
      null,
      queryList,
      false,
    );

    const survQuestions = query.entities.map((survQuestion) =>
      this.toModelPanel(survQuestion),
    );

    const pageMetaDto = new PageMetaDto({
      total: query.itemCount,
      pageOptionsDto: queryDto,
      itemPageCount: survQuestions.length,
    });

    return new PageDto(survQuestions, pageMetaDto);
  }

  async ensureExistOrFail(patientId: number, surveyId: number) {
    await this.getByIdOrFail(patientId, surveyId);
  }

  async getByIdOrFail(
    patientId: number,
    surveyId: number,
  ): Promise<PatientSurveyModel> {
    const survey = await this.getById(patientId, surveyId);
    if (!survey) {
      throw new NotFoundException({
        message: [
          `validation.patient_survey_answer.NOT_FOUND|{"patientId":"${patientId}","surveyId":"${surveyId}"}`,
        ],
      });
    }
    return survey;
  }

  async getById(
    patientId: number,
    surveyId: number,
    useCache = true,
  ): Promise<PatientSurveyModel> {
    let cacheKey = null;
    let patientSurvAns: PatientSurveyModel = null;
    if (useCache) {
      cacheKey = `${this.cacheKey}${patientId}:${surveyId}`;
      patientSurvAns =
        await this.redisService.get<PatientSurveyModel>(cacheKey);
      if (patientSurvAns) {
        return patientSurvAns;
      }
    }
    const query = await this.getBasicQuery();
    const survQPAQry = await query
      .where(`patientId = :patientId and surveyId = :surveyId`, {
        patientId,
        surveyId,
      })
      .getRawOne();
    if (!survQPAQry) {
      return null;
    }
    patientSurvAns = this.toModel(survQPAQry);
    if (cacheKey) {
      await this.redisService.set<PatientSurveyModel>(
        cacheKey,
        patientSurvAns,
        this.cacheTime,
      );
    }
    return patientSurvAns;
  }

  private toModelPanel(entity: PatientSurvey): PatientSurveyModel {
    const model = new PatientSurveyModel();

    model.patientId = Number(entity.patientId);
    model.surveyId = Number(entity.surveyId);
    model.age = Number(model.age);
    model.totalScore = Number(model.totalScore);
    model.waistPerimeter = Number(model.waistPerimeter);
    model.weight = Number(model.weight);
    model.size = Number(model.size);
    model.imcc = Number(model.imcc);
    model.estimatedRisk = Number(model.estimatedRisk);

    model.createdAt = entity.createdAt;

    return model;
  }

  private toModel(entity: PatientSurvey): PatientSurveyModel {
    const model = new PatientSurveyModel();

    model.patientId = Number(entity.patientId);
    model.surveyId = Number(entity.surveyId);
    model.age = Number(model.age);
    model.totalScore = Number(model.totalScore);
    model.waistPerimeter = Number(model.waistPerimeter);
    model.weight = Number(model.weight);
    model.size = Number(model.size);
    model.imcc = Number(model.imcc);
    model.estimatedRisk = Number(model.estimatedRisk);

    model.createdAt = entity.createdAt;

    return model;
  }
}
