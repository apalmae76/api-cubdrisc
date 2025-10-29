import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ListToUpdOrderModel } from 'src/domain/model/surveyQuestion';
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
    const entity = await this.toCreate(data);
    const dataSaved = await repo.save(entity);
    return this.toModel(dataSaved);
  }

  private async toCreate(
    model: SurveyRiskCalculationRangesCreateModel,
  ): Promise<SurveyRiskCalculationRanges> {
    const entity = new SurveyRiskCalculationRanges();

    entity.surveyId = model.surveyId;
    entity.description = model.description;
    entity.minRange = model.minRange;
    entity.maxRange = model.maxRange;
    entity.order = await this.getLastOrder(model.surveyId);

    return entity;
  }

  async getLastOrder(surveyId: number): Promise<number> {
    const maxQuery = await this.surveyRCRangesEntity
      .createQueryBuilder('srcr')
      .select('max(srcr.order) as "maxOrder"')
      .where('survey_id = :surveyId', { surveyId })
      .getRawOne();
    return maxQuery ? maxQuery.maxOrder + 1 : 1;
  }

  async update(
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
      await this.cleanCacheData(surveyId);
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
      .where('survey_id = :surveyId and id = :id and deleted_at is null', {
        surveyId,
        id,
      })
      .execute();
    if (affected > 0) {
      await this.cleanCacheData(surveyId);
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

  async setOrder(
    surveyId: number,
    id: number,
    order: number,
    em: EntityManager,
  ): Promise<void> {
    const repo = em
      ? em.getRepository(SurveyRiskCalculationRanges)
      : this.surveyRCRangesEntity;
    await repo.update({ surveyId, id }, { order });
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
      .where('survey_id = :surveyId and id = :id', { surveyId, id })
      .getRawOne();
    if (row) {
      return row.deletedAt !== null;
    }
    return null;
  }

  async cleanCacheData(surveyId: number) {
    const keyPattern = `${this.cacheKey}${surveyId}:*`;
    await this.redisService.removeAllKeysWithPattern(keyPattern);
  }

  private getBasicQuery() {
    return this.surveyRCRangesEntity
      .createQueryBuilder('srcr')
      .select([
        'srcr.survey_id as "surveyId"',
        'srcr.id as "id"',
        'srcr.description as "description"',
        'srcr.min_range as "minRange"',
        'srcr.max_range as "maxRange"',
        'srcr.created_at as "createdAt"',
        'srcr.updated_at as "updatedAt"',
        'srcr.deleted_at as "deletedAt"',
      ])
      .withDeleted();
  }

  async canUpdate(
    surveyId: number,
    id: number,
  ): Promise<SurveyRiskCalculationRangesModel> {
    const rule = await this.getByIdOrFail(surveyId, id);
    return rule;
  }

  async getToMove(
    surveyId: number,
    id: number,
    order: number,
  ): Promise<ListToUpdOrderModel[]> {
    const rules = await this.surveyRCRangesEntity
      .createQueryBuilder('srcr')
      .select(['id as "id"', 'order as "order"'])
      .where('survey_id = :surveyId and id <> :id and order >= :order', {
        surveyId,
        id,
        order,
      })
      .orderBy('order', 'ASC')
      .getRawMany();

    return rules.map((rule) => this.toModel(rule, true));
  }

  async getByIdForPanel(
    surveyId: number,
    id: number,
  ): Promise<SurveyRiskCalculationRangesModel> {
    const query = this.getBasicQuery();
    query.where('survey.id = :surveyId and id = :id', {
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
      'srcr',
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
      .where('survey_id = :surveyId and id = :id', { surveyId, id })
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

    model.surveyId = Number(entity.surveyId);
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

    model.surveyId = Number(entity.surveyId);
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
