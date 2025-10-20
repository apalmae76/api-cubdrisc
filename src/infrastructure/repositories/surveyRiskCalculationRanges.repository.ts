import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  SurveyRiskCalculationRangesCreateModel,
  SurveyRiskCalculationRangesModel,
  SurveyRiskCalculationRangesUpdateModel,
} from 'src/domain/model/surveyRiskCalculationRanges';
import { ISurveyRiskCalculationRangesRepository } from 'src/domain/repositories/surveyRiskCalculationRangesRepository.interface';
import { EntityManager, Repository } from 'typeorm';
import { GetGenericAllDto } from '../common/dtos/genericRepo-dto.class';
import { PageDto } from '../common/dtos/page.dto';
import { PageMetaDto } from '../common/dtos/pageMeta.dto';
import { SurveyRiskCalculationRanges } from '../entities/surveyRangesForRiskCalculation.entity';
import { ApiLoggerService } from '../services/logger/logger.service';
import { ApiRedisService } from '../services/redis/redis.service';
import { BaseRepository } from './base.repository';

@Injectable()
export class DatabaseSurveyRiskCalculationRangesRepository
  extends BaseRepository
  implements ISurveyRiskCalculationRangesRepository {
  private readonly cacheKey = 'Repository:SurveyRiskCalculationRanges:';
  private readonly cacheTime = 15 * 60; // 15 mins
  constructor(
    @InjectRepository(SurveyRiskCalculationRanges)
    private readonly surveyRCRangesEntity: Repository<SurveyRiskCalculationRanges>,
    private readonly redisService: ApiRedisService,
    protected readonly logger: ApiLoggerService,
  ) {
    super(surveyRCRangesEntity, logger);
  }

  async create(
    data: SurveyRiskCalculationRangesCreateModel,
    em: EntityManager,
  ): Promise<SurveyRiskCalculationRangesModel> {
    const repo = em
      ? em.getRepository(SurveyRiskCalculationRanges)
      : this.surveyRCRangesEntity;
    const entity = this.toCreate(data);
    const dataSaved = await repo.save(entity);
    return this.toModel(dataSaved);
  }

  private toCreate(
    model: SurveyRiskCalculationRangesCreateModel,
  ): SurveyRiskCalculationRanges {
    const entity = new SurveyRiskCalculationRanges();

    entity.description = model.description;
    entity.minRange = model.minRange;
    entity.maxRange = model.maxRange;

    return entity;
  }

  async updateIfExistOrFail(
    surveyId: number,
    id: number,
    survey: SurveyRiskCalculationRangesUpdateModel,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em
      ? em.getRepository(SurveyRiskCalculationRanges)
      : this.surveyRCRangesEntity;
    const entity = await repo.findOne({ where: { id: id } });
    if (!entity) {
      throw new NotFoundException({
        message: [`validation.survey.NOT_FOUND|{"id":"${id}"}`],
      });
    }
    const update = await repo.update({ surveyId, id }, survey);
    if (update.affected > 0) {
      await this.cleanCacheData(surveyId, id);
    }
    return true;
  }

  async softDelete(
    surveyId: number,
    id: number,
    em: EntityManager = null,
  ): Promise<boolean> {
    const repo = em
      ? em.getRepository(SurveyRiskCalculationRanges)
      : this.surveyRCRangesEntity;

    const { affected } = await repo
      .createQueryBuilder()
      .update(SurveyRiskCalculationRanges)
      .set({ deletedAt: new Date() })
      .where('surveyId = :surveyId and id = :id and deleted_at is null', {
        surveyId,
        id,
      })
      .execute();
    if (affected > 0) {
      await this.cleanCacheData(surveyId, id);
      return true;
    } else {
      const rowIsDeleted = await this.isRowDeleted(surveyId, id, em);
      if (rowIsDeleted === null) {
        this.logger.warn(
          `Survey risk calculation range repository, soft delete: Sended id does not exist `,
          {
            affected,
            rowIsDeleted: rowIsDeleted ? rowIsDeleted : 'NULL',
            context: `${DatabaseSurveyRiskCalculationRangesRepository.name}.softDelete`,
          },
        );
      }
      return false;
    }
  }

  private async isRowDeleted(
    surveyId: number,
    id: number,
    em: EntityManager = null,
  ): Promise<boolean> {
    const repo = em
      ? em.getRepository(SurveyRiskCalculationRanges)
      : this.surveyRCRangesEntity;

    const row = await repo
      .createQueryBuilder()
      .select(['deleted_at as "deletedAt"'])
      .withDeleted()
      .where('surveyId = :surveyId and id = :id', { surveyId, id })
      .getRawOne();
    if (row) {
      return row.deletedAt !== null;
    }
    return null;
  }

  private async cleanCacheData(surveyId: number, id: number) {
    const cacheKey = `${this.cacheKey}${surveyId}:${id}`;
    await this.redisService.del(cacheKey);
  }

  private getBasicQuery() {
    return this.surveyRCRangesEntity
      .createQueryBuilder('surveyrcr')
      .select([
        'surveyrcr.id as "id"',
        'surveyrcr.description as "description"',
        'surveyrcr.min_range as "minRange"',
        'surveyrcr.max_range as "maxRange"',
        'surveyrcr.created_at as "createdAt"',
        'surveyrcr.updated_at as "updatedAt"',
        'surveyrcr.deleted_at as "deletedAt"',
      ])
      .withDeleted();
  }

  async getByIdForPanel(
    surveyId: number,
    id: number,
  ): Promise<SurveyRiskCalculationRangesModel> {
    const query = this.getBasicQuery();
    query.where('survey.id = :surveyId and surveyrcr.id = :id', {
      surveyId,
      id,
    });
    const survey = await query.getRawOne();
    if (!survey) {
      return null;
    }
    return this.toModelPanel(survey, true);
  }

  async getByQuery(
    queryDto: GetGenericAllDto,
  ): Promise<PageDto<SurveyRiskCalculationRangesModel>> {
    const queryList = this.getBasicQuery();

    const query = await super.getByQueryBase<SurveyRiskCalculationRanges>(
      queryDto,
      'surveyrcr',
      null,
      queryList,
      false,
    );

    const surveyRCRs = query.entities.map((surveyRCR) =>
      this.toModelPanel(surveyRCR),
    );

    const pageMetaDto = new PageMetaDto({
      total: query.itemCount,
      pageOptionsDto: queryDto,
      itemPageCount: surveyRCRs.length,
    });

    return new PageDto(surveyRCRs, pageMetaDto);
  }

  async ensureExistOrFail(surveyId: number, id: number) {
    await this.getByIdOrFail(surveyId, id);
  }

  async getByIdOrFail(
    surveyId: number,
    id: number,
  ): Promise<SurveyRiskCalculationRangesModel> {
    const surveyRCR = await this.getById(surveyId, id);
    if (!surveyRCR) {
      throw new NotFoundException({
        message: [
          `validation.survey_risk_calculation_range.NOT_FOUND|{"surveyId":"${surveyId}","id":"${id}"}`,
        ],
      });
    }
    return surveyRCR;
  }

  async getById(
    surveyId: number,
    id: number,
    useCache = true,
  ): Promise<SurveyRiskCalculationRangesModel> {
    let cacheKey = null;
    let surveyRCR: SurveyRiskCalculationRangesModel = null;
    if (useCache) {
      cacheKey = `${this.cacheKey}${id}`;
      surveyRCR =
        await this.redisService.get<SurveyRiskCalculationRangesModel>(cacheKey);
      if (surveyRCR) {
        return surveyRCR;
      }
    }
    const query = await this.getBasicQuery();
    const surveyQry = await query
      .where('surveyId = :surveyId and id = :id', { surveyId, id })
      .getRawOne();
    if (!surveyQry) {
      return null;
    }
    surveyRCR = this.toModel(surveyQry, true);
    if (cacheKey) {
      await this.redisService.set<SurveyRiskCalculationRangesModel>(
        cacheKey,
        surveyRCR,
        this.cacheTime,
      );
    }
    return surveyRCR;
  }

  areSame(
    surveyRCR1: SurveyRiskCalculationRangesModel,
    surveyRCR2: SurveyRiskCalculationRangesUpdateModel,
  ): boolean {
    return (
      (surveyRCR2.description === undefined ||
        surveyRCR1.description === surveyRCR2.description) &&
      (surveyRCR2.minRange === undefined ||
        surveyRCR1.minRange === surveyRCR2.minRange) &&
      (surveyRCR2.maxRange === undefined ||
        surveyRCR1.maxRange === surveyRCR2.maxRange)
    );
  }

  private toModelPanel(
    entity: SurveyRiskCalculationRanges,
    isForDetails = false,
  ): SurveyRiskCalculationRangesModel {
    const model: SurveyRiskCalculationRangesModel =
      new SurveyRiskCalculationRangesModel();

    if (!isForDetails) {
      model.id = Number(entity.id);
    }

    model.description = entity.description;
    model.minRange = entity.minRange;
    model.maxRange = entity.maxRange;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;

    return model;
  }

  private toModel(
    entity: SurveyRiskCalculationRanges,
    isForPanel = false,
  ): SurveyRiskCalculationRangesModel {
    const model: SurveyRiskCalculationRangesModel =
      new SurveyRiskCalculationRangesModel();

    if (!isForPanel) {
      model.id = Number(entity.id);
    }
    model.description = entity.description;
    model.minRange = entity.minRange;
    model.maxRange = entity.maxRange;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;

    return model;
  }
}
