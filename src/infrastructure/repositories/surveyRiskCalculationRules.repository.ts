import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ListToUpdOrderModel } from 'src/domain/model/surveyQuestion';
import {
  SurveyRiskCalculationRulesCreateModel,
  SurveyRiskCalculationRulesModel,
  SurveyRiskCalculationRulesUpdateModel,
} from 'src/domain/model/surveyRiskCalculationRules';
import { ISurveyRiskCalculationRulesRepository } from 'src/domain/repositories/surveyRiskCalculationRulesRepository.interface';
import { EntityManager, Repository } from 'typeorm';
import { GetGenericAllDto } from '../common/dtos/genericRepo-dto.class';
import { PageDto } from '../common/dtos/page.dto';
import { PageMetaDto } from '../common/dtos/pageMeta.dto';
import { SurveyRiskCalculationRules } from '../entities/surveyRulesForRiskCalculation.entity';
import { ApiLoggerService } from '../services/logger/logger.service';
import { ApiRedisService } from '../services/redis/redis.service';
import { BaseRepository } from './base.repository';

@Injectable()
export class DatabaseSurveyRiskCalculationRulesRepository
  extends BaseRepository
  implements ISurveyRiskCalculationRulesRepository {
  private readonly cacheKey = 'Repository:SurveyRiskCalculationRules:';
  private readonly cacheTime = 15 * 60; // 15 mins
  constructor(
    @InjectRepository(SurveyRiskCalculationRules)
    private readonly surveyRCRulesEntity: Repository<SurveyRiskCalculationRules>,
    private readonly redisService: ApiRedisService,
    protected readonly logger: ApiLoggerService,
  ) {
    super(surveyRCRulesEntity, logger);
  }

  async create(
    data: SurveyRiskCalculationRulesCreateModel,
    em: EntityManager,
  ): Promise<SurveyRiskCalculationRulesModel> {
    const repo = em
      ? em.getRepository(SurveyRiskCalculationRules)
      : this.surveyRCRulesEntity;
    const entity = await this.toCreate(data);
    const dataSaved = await repo.save(entity);
    return this.toModel(dataSaved);
  }

  private async toCreate(
    model: SurveyRiskCalculationRulesCreateModel,
  ): Promise<SurveyRiskCalculationRules> {
    const entity = new SurveyRiskCalculationRules();

    entity.surveyId = model.surveyId;
    entity.description = model.description;
    entity.minRange = model.minRange;
    entity.maxRange = model.maxRange;
    entity.percent = model.percent;
    entity.order = await this.getLastOrder(model.surveyId);

    return entity;
  }

  async getLastOrder(surveyId: number): Promise<number> {
    const maxQuery = await this.surveyRCRulesEntity
      .createQueryBuilder('srcr')
      .select('max(srcr.order) as "maxOrder"')
      .where('survey_id = :surveyId', { surveyId })
      .getRawOne();
    return maxQuery ? maxQuery.maxOrder + 1 : 1;
  }

  async update(
    surveyId: number,
    id: number,
    survey: SurveyRiskCalculationRulesUpdateModel,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em
      ? em.getRepository(SurveyRiskCalculationRules)
      : this.surveyRCRulesEntity;
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
      ? em.getRepository(SurveyRiskCalculationRules)
      : this.surveyRCRulesEntity;

    const { affected } = await repo
      .createQueryBuilder()
      .update(SurveyRiskCalculationRules)
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
            context: `${DatabaseSurveyRiskCalculationRulesRepository.name}.softDelete`,
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
      ? em.getRepository(SurveyRiskCalculationRules)
      : this.surveyRCRulesEntity;
    await repo.update({ surveyId, id }, { order });
  }

  private async isRowDeleted(
    surveyId: number,
    id: number,
    em: EntityManager = null,
  ): Promise<boolean> {
    const repo = em
      ? em.getRepository(SurveyRiskCalculationRules)
      : this.surveyRCRulesEntity;

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
    return this.surveyRCRulesEntity
      .createQueryBuilder('srcr')
      .select([
        'srcr.survey_id as "surveyId"',
        'srcr.id as "id"',
        'srcr.description as "description"',
        'srcr.min_range as "minRange"',
        'srcr.max_range as "maxRange"',
        'srcr.percent as "percent"',
        'srcr.order as "order"',
        'srcr.created_at as "createdAt"',
        'srcr.updated_at as "updatedAt"',
        'srcr.deleted_at as "deletedAt"',
      ])
      .withDeleted();
  }

  async canUpdate(
    surveyId: number,
    id: number,
  ): Promise<SurveyRiskCalculationRulesModel> {
    const rule = await this.getByIdOrFail(surveyId, id);
    return rule;
  }

  async getToMove(
    surveyId: number,
    id: number,
    order: number,
  ): Promise<ListToUpdOrderModel[]> {
    const rules = await this.surveyRCRulesEntity
      .createQueryBuilder('srcr')
      .select(['srcr.id as "id"', 'srcr."order" as "order"'])
      .where(
        'srcr.survey_id = :surveyId and srcr.id <> :id and srcr."order" >= :order',
        {
          surveyId,
          id,
          order,
        },
      )
      .orderBy('srcr."order"', 'ASC')
      .getRawMany();

    return rules.map((rule) => this.toModel(rule, true));
  }

  async getByIdForPanel(
    surveyId: number,
    id: number,
  ): Promise<SurveyRiskCalculationRulesModel> {
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
  ): Promise<PageDto<SurveyRiskCalculationRulesModel>> {
    const queryList = this.getBasicQuery();

    const query = await super.getByQueryBase<SurveyRiskCalculationRules>(
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
  ): Promise<SurveyRiskCalculationRulesModel> {
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
  ): Promise<SurveyRiskCalculationRulesModel> {
    let cacheKey = null;
    let surveyRCR: SurveyRiskCalculationRulesModel = null;
    if (useCache) {
      cacheKey = `${this.cacheKey}${id}`;
      surveyRCR =
        await this.redisService.get<SurveyRiskCalculationRulesModel>(cacheKey);
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
      await this.redisService.set<SurveyRiskCalculationRulesModel>(
        cacheKey,
        surveyRCR,
        this.cacheTime,
      );
    }
    return surveyRCR;
  }

  private toModelPanel(
    entity: SurveyRiskCalculationRules,
    isForDetails = false,
  ): SurveyRiskCalculationRulesModel {
    const model: SurveyRiskCalculationRulesModel =
      new SurveyRiskCalculationRulesModel();

    model.surveyId = Number(entity.surveyId);
    if (!isForDetails) {
      model.id = Number(entity.id);
    }

    model.description = entity.description;
    model.minRange = entity.minRange;
    model.maxRange = entity.maxRange;
    model.order = entity.order;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;

    return model;
  }

  private toModel(
    entity: SurveyRiskCalculationRules,
    isForPanel = false,
  ): SurveyRiskCalculationRulesModel {
    const model: SurveyRiskCalculationRulesModel =
      new SurveyRiskCalculationRulesModel();

    model.surveyId = Number(entity.surveyId);
    if (!isForPanel) {
      model.id = Number(entity.id);
    }
    model.description = entity.description;
    model.minRange = entity.minRange;
    model.maxRange = entity.maxRange;
    model.order = entity.order;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;

    return model;
  }
}
