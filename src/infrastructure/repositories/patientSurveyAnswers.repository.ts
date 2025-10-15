import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PatientSurveyAnswersCreateModel,
  PatientSurveyAnswersModel,
} from 'src/domain/model/patientSurveyAnswers';
import { IPatientSurveyAnswersRepository } from 'src/domain/repositories/patientSurveyAnswersRepository.interface';
import { EntityManager, Repository } from 'typeorm';
import { GetGenericAllDto } from '../common/dtos/genericRepo-dto.class';
import { PageDto } from '../common/dtos/page.dto';
import { PageMetaDto } from '../common/dtos/pageMeta.dto';
import { PatientSurveyAnswers } from '../entities/patientSurveyAnswers.entity';
import { ApiLoggerService } from '../services/logger/logger.service';
import { ApiRedisService } from '../services/redis/redis.service';
import { BaseRepository } from './base.repository';
@Injectable()
export class DatabasePatientSurveyAnswersRepository
  extends BaseRepository
  implements IPatientSurveyAnswersRepository {
  private readonly cacheKey = 'Repository:PatientSurveyAnswers:';
  private readonly cacheTime = 15 * 60; // 15 mins
  constructor(
    @InjectRepository(PatientSurveyAnswers)
    private readonly surveyQPAEntity: Repository<PatientSurveyAnswers>,
    private readonly redisService: ApiRedisService,
    protected readonly logger: ApiLoggerService,
  ) {
    super(surveyQPAEntity, logger);
  }

  async create(
    data: PatientSurveyAnswersCreateModel,
    em: EntityManager,
  ): Promise<PatientSurveyAnswersModel> {
    const repo = em
      ? em.getRepository(PatientSurveyAnswers)
      : this.surveyQPAEntity;
    const entity = this.toCreate(data);
    const dataSaved = await repo.save(entity);
    this.cleanCacheData(data);
    return this.toModel(dataSaved);
  }

  private toCreate(
    model: PatientSurveyAnswersCreateModel,
  ): PatientSurveyAnswers {
    const entity = new PatientSurveyAnswers();

    entity.patientId = model.patientId;
    entity.surveyId = model.surveyId;
    entity.surveyQuestionId = model.surveyQuestionId;
    entity.surveyQuestionAnswerId = model.surveyQuestionAnswerId;

    return entity;
  }

  private async cleanCacheData({
    patientId,
    surveyId,
    surveyQuestionId,
    surveyQuestionAnswerId,
  }: {
    patientId: number;
    surveyId: number;
    surveyQuestionId: number;
    surveyQuestionAnswerId: number;
  }) {
    const cacheKey = `${this.cacheKey}${patientId}:${surveyId}:${surveyQuestionId}:${surveyQuestionAnswerId}`;
    await this.redisService.del(cacheKey);
  }

  private getBasicQuery() {
    return this.surveyQPAEntity
      .createQueryBuilder('psa')
      .select([
        'psa.patient_id as "patientId"',
        'psa.survey_id as "surveyId"',
        'psa.survey_question_id as "surveyQuestionId"',
        'psa.survey_question_answer_id as "surveyQuestionAnswerId"',
        'psa.created_at as "createdAt"',
      ])
      .withDeleted();
  }

  async getByIdForPanel(
    patientId: number,
    surveyId: number,
    surveyQuestionId: number,
    surveyQuestionAnswerId: number,
  ): Promise<PatientSurveyAnswersModel> {
    const query = this.getBasicQuery();
    query.where(
      `patientId = :patientId and surveyId = :surveyId and
        surveyQuestionId = :surveyQuestionId and surveyQuestionAnswerId = :surveyQuestionAnswerId`,
      { patientId, surveyId, surveyQuestionId, surveyQuestionAnswerId },
    );
    const survey = await query.getRawOne();
    if (!survey) {
      return null;
    }
    return this.toModelPanel(survey);
  }

  async getByQuery(
    queryDto: GetGenericAllDto,
  ): Promise<PageDto<PatientSurveyAnswersModel>> {
    const queryList = this.getBasicQuery();

    const query = await super.getByQueryBase<PatientSurveyAnswersModel>(
      queryDto,
      'psa',
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

  async ensureExistOrFail(
    patientId: number,
    surveyId: number,
    surveyQuestionId: number,
    surveyQuestionAnswerId: number,
  ) {
    await this.getByIdOrFail(
      patientId,
      surveyId,
      surveyQuestionId,
      surveyQuestionAnswerId,
    );
  }

  async getByIdOrFail(
    patientId: number,
    surveyId: number,
    surveyQuestionId: number,
    surveyQuestionAnswerId: number,
  ): Promise<PatientSurveyAnswersModel> {
    const survey = await this.getById(
      patientId,
      surveyId,
      surveyQuestionId,
      surveyQuestionAnswerId,
    );
    if (!survey) {
      throw new NotFoundException({
        message: [
          `validation.patient_survey_answer.NOT_FOUND|{"surveyId":"${surveyId}","surveyQuestionId":"${surveyQuestionId}","surveyQuestionAnswerId":"${surveyQuestionAnswerId}"}`,
        ],
      });
    }
    return survey;
  }

  async getById(
    patientId: number,
    surveyId: number,
    surveyQuestionId: number,
    surveyQuestionAnswerId: number,
    useCache = true,
  ): Promise<PatientSurveyAnswersModel> {
    let cacheKey = null;
    let patientSurvAns: PatientSurveyAnswersModel = null;
    if (useCache) {
      cacheKey = `${this.cacheKey}${patientId}:${surveyId}:${surveyQuestionId}:${surveyQuestionAnswerId}`;
      patientSurvAns =
        await this.redisService.get<PatientSurveyAnswersModel>(cacheKey);
      if (patientSurvAns) {
        return patientSurvAns;
      }
    }
    const query = await this.getBasicQuery();
    const survQPAQry = await query
      .where(
        `patientId = :patientId and surveyId = :surveyId and
          surveyQuestionId = :surveyQuestionId and surveyQuestionAnswerId = :surveyQuestionAnswerId`,
        { patientId, surveyId, surveyQuestionId, surveyQuestionAnswerId },
      )
      .getRawOne();
    if (!survQPAQry) {
      return null;
    }
    patientSurvAns = this.toModel(survQPAQry);
    if (cacheKey) {
      await this.redisService.set<PatientSurveyAnswersModel>(
        cacheKey,
        patientSurvAns,
        this.cacheTime,
      );
    }
    return patientSurvAns;
  }

  private toModelPanel(
    entity: PatientSurveyAnswersModel,
  ): PatientSurveyAnswersModel {
    const model = new PatientSurveyAnswersModel();

    model.patientId = Number(entity.patientId);
    model.surveyId = Number(entity.surveyId);
    model.surveyQuestionId = Number(model.surveyQuestionId);
    model.surveyQuestionAnswerId = Number(model.surveyQuestionAnswerId);

    model.createdAt = entity.createdAt;

    return model;
  }

  private toModel(
    entity: PatientSurveyAnswersModel,
  ): PatientSurveyAnswersModel {
    const model = new PatientSurveyAnswersModel();

    model.patientId = Number(entity.patientId);
    model.surveyId = Number(entity.surveyId);
    model.surveyQuestionId = Number(model.surveyQuestionId);
    model.surveyQuestionAnswerId = Number(model.surveyQuestionAnswerId);

    model.createdAt = entity.createdAt;

    return model;
  }
}
