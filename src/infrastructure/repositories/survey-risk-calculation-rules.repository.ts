import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { extractErrorDetails } from '../common/utils/extract-error-details';
import { SurveyRiskCalculationRules } from '../entities/survey-rules-for-risk-calculation.entity';
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
    try {
      const repo = em
        ? em.getRepository(SurveyRiskCalculationRules)
        : this.surveyRCRulesEntity;
      const entity = await this.toCreate(data);
      const dataSaved = await repo.save(entity);
      return this.toModel(dataSaved);
    } catch (er: unknown) {
      await this.manageErrors(data, er);
      throw er;
    }
  }

  private async manageErrors(
    newData:
      | SurveyRiskCalculationRulesCreateModel
      | SurveyRiskCalculationRulesUpdateModel,
    er: unknown,
  ) {
    const { message } = extractErrorDetails(er);

    if (message) {
      if (message.includes('IDX_c892da8bf20579372c66af8d74')) {
        const addInfo = {
          technicalError: `Rule description must be unique (${newData.description}), check`,
          description: newData.description,
        };
        throw new BadRequestException({
          message: [
            `validation.survey_risk_calculation.DESCRIPTION_IS_UNIQUE|${JSON.stringify(addInfo)}`,
          ],
        });
      } else if (message.includes('IDX_74b959f9bf4fa4f86d9820fde7')) {
        const addInfo = {
          technicalError: `Rule label must be unique (${newData.label}), check`,
          label: newData.label,
        };
        throw new BadRequestException({
          message: [
            `validation.survey_risk_calculation.LABEL_IS_UNIQUE|${JSON.stringify(addInfo)}`,
          ],
        });
      }
    }
  }

  private async toCreate(
    model: SurveyRiskCalculationRulesCreateModel,
  ): Promise<SurveyRiskCalculationRules> {
    const entity = new SurveyRiskCalculationRules();

    entity.surveyId = model.surveyId;
    entity.label = model.label;
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

  async ensureMinMaxDoNotOverlap(
    surveyId: number,
    minRange: number,
    maxRange: number,
    id: number | null = null,
  ): Promise<void> {
    const query = this.surveyRCRulesEntity
      .createQueryBuilder('srcr')
      .select('count(1) as total')
      .where('survey_id = :surveyId', { surveyId })
      .andWhere(
        `(:minRange between min_range and max_range or :maxRange between min_range and max_range)`,
        { minRange, maxRange },
      );

    if (id) {
      query.andWhere('id <> :id', { id });
    }
    const overlap = await query.getRawOne();
    if (overlap?.total && Number(overlap?.total) > 0) {
      throw new BadRequestException({
        message: [`validation.survey_risk_calculation.RULE_OVERLAP_EXISTING`],
      });
    }
  }

  async update(
    surveyId: number,
    id: number,
    survey: SurveyRiskCalculationRulesUpdateModel,
    em: EntityManager,
  ): Promise<boolean> {
    try {
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
    } catch (er: unknown) {
      await this.manageErrors(survey, er);
      throw er;
    }
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

  async getCount(surveyId: number): Promise<number> {
    return await this.surveyRCRulesEntity
      .createQueryBuilder()
      .where('survey_id = :surveyId', { surveyId })
      .getCount();
  }

  async cleanCacheData(surveyId: number) {
    const pattern = `${this.cacheKey}${surveyId}:*`;
    await this.redisService.removeAllKeysWithPattern(pattern);
  }

  private getBasicQuery() {
    return this.surveyRCRulesEntity
      .createQueryBuilder('srcr')
      .select([
        'srcr.survey_id as "surveyId"',
        'srcr.id as "id"',
        'srcr.label as "label"',
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

    const query = await super.getByQueryBase<SurveyRiskCalculationRules>({
      queryDto,
      alias: 'srcr',
      queryList,
    });

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
      cacheKey = `${this.cacheKey}${surveyId}:${id}`;
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

  async getSurveyRules(
    surveyId: number,
    useCache = true,
  ): Promise<SurveyRiskCalculationRulesModel[]> {
    let cacheKey = null;
    let surveyRCRs: SurveyRiskCalculationRulesModel[] = [];
    if (useCache) {
      cacheKey = `${this.cacheKey}${surveyId}`;
      surveyRCRs =
        await this.redisService.get<SurveyRiskCalculationRulesModel[]>(
          cacheKey,
        );
      if (surveyRCRs) {
        return surveyRCRs;
      }
    }
    const query = await this.getBasicQuery();
    const surveyQry = await query
      .where('survey_id = :surveyId', { surveyId })
      .getRawMany();

    surveyRCRs = surveyQry.map((surveyRCR) => this.toModel(surveyRCR, true));
    if (cacheKey) {
      await this.redisService.set<SurveyRiskCalculationRulesModel[]>(
        cacheKey,
        surveyRCRs,
        this.cacheTime,
      );
    }
    return surveyRCRs;
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

    model.label = entity.label;
    model.description = entity.description;
    model.minRange = Number(entity.minRange);
    model.maxRange = Number(entity.maxRange);
    model.percent = Number(entity.percent);
    model.order = Number(entity.order);

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
    model.label = entity.label;
    model.description = entity.description;
    model.minRange = Number(entity.minRange);
    model.maxRange = Number(entity.maxRange);
    model.percent = Number(entity.percent);
    model.order = Number(entity.order);

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;

    return model;
  }
}
