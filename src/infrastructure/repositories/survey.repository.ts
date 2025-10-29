import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  SurveyCreateModel,
  SurveyModel,
  SurveyUpdateModel,
} from 'src/domain/model/survey';
import { ISurveyRepository } from 'src/domain/repositories/surveyRepository.interface';
import { EntityManager, Repository } from 'typeorm';
import { GetGenericAllDto } from '../common/dtos/genericRepo-dto.class';
import { PageDto } from '../common/dtos/page.dto';
import { PageMetaDto } from '../common/dtos/pageMeta.dto';
import { Survey } from '../entities/survey.entity';
import { ApiLoggerService } from '../services/logger/logger.service';
import { ApiRedisService } from '../services/redis/redis.service';
import { BaseRepository } from './base.repository';

@Injectable()
export class DatabaseSurveyRepository
  extends BaseRepository
  implements ISurveyRepository {
  private readonly cacheKey = 'Repository:Survey:';
  private readonly cacheTime = 15 * 60; // 15 mins
  constructor(
    @InjectRepository(Survey)
    private readonly surveyEntity: Repository<Survey>,
    private readonly redisService: ApiRedisService,
    protected readonly logger: ApiLoggerService,
  ) {
    super(surveyEntity, logger);
  }

  async create(
    data: SurveyCreateModel,
    em: EntityManager,
  ): Promise<SurveyModel> {
    const repo = em ? em.getRepository(Survey) : this.surveyEntity;
    const entity = this.toCreate(data);
    const dataSaved = await repo.save(entity);
    return this.toModel(dataSaved);
  }

  private toCreate(model: SurveyCreateModel): Survey {
    const entity = new Survey();

    entity.name = model.name;
    entity.description = model.description;
    entity.calcRisks = model.calcRisks;
    entity.active = false;

    return entity;
  }

  async update(
    id: number,
    payload: SurveyUpdateModel,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em ? em.getRepository(Survey) : this.surveyEntity;
    const update = await repo.update({ id }, payload);
    if (update.affected > 0) {
      await this.cleanCacheData(id);
      return true;
    }
    return false;
  }

  async softDelete(id: number, em: EntityManager = null): Promise<boolean> {
    const repo = em ? em.getRepository(Survey) : this.surveyEntity;

    const { affected } = await repo
      .createQueryBuilder()
      .update(Survey)
      .set({ deletedAt: new Date(), active: false })
      .where('id = :id and deleted_at is null', { id })
      .execute();
    if (affected > 0) {
      await this.cleanCacheData(id);
      return true;
    } else {
      const rowIsDeleted = await this.isRowDeleted(id);
      if (rowIsDeleted === null) {
        this.logger.warn(
          `Survey repository, soft delete: Sended id does not exist `,
          {
            affected,
            rowIsDeleted: rowIsDeleted ? rowIsDeleted : 'NULL',
            context: `${DatabaseSurveyRepository.name}.softDelete`,
          },
        );
      }
      return false;
    }
  }

  private async cleanCacheData(id: number) {
    const cacheKey = `${this.cacheKey}${id}`;
    await this.redisService.del(cacheKey);
  }

  private async isRowDeleted(id: number): Promise<boolean> {
    const row = await this.surveyEntity
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

  private getBasicQuery() {
    return this.surveyEntity
      .createQueryBuilder('survey')
      .select([
        'survey.id as "id"',
        'survey.name as "name"',
        'survey.description as "description"',
        'survey.calc_risks as "calcRisks"',
        'survey.active as "active"',
        'survey.created_at as "createdAt"',
        'survey.updated_at as "updatedAt"',
        'survey.deleted_at as "deletedAt"',
      ])
      .withDeleted();
  }

  async getByIdForPanel(id: number): Promise<SurveyModel> {
    const query = this.getBasicQuery();
    query.where('survey.id = :id', { id });
    const survey = await query.getRawOne();
    if (!survey) {
      return null;
    }
    return this.toModelPanel(survey, true);
  }

  async getByQuery(queryDto: GetGenericAllDto): Promise<PageDto<SurveyModel>> {
    const queryList = this.getBasicQuery();

    const query = await super.getByQueryBase<Survey>(
      queryDto,
      'survey',
      null,
      queryList,
      false,
    );

    const surveys = query.entities.map((survey) => this.toModelPanel(survey));

    const pageMetaDto = new PageMetaDto({
      total: query.itemCount,
      pageOptionsDto: queryDto,
      itemPageCount: surveys.length,
    });

    return new PageDto(surveys, pageMetaDto);
  }

  async ensureExistOrFail(id: number) {
    await this.getByIdOrFail(id);
  }

  async getByIdOrFail(id: number): Promise<SurveyModel> {
    const survey = await this.getById(id);
    if (!survey) {
      throw new NotFoundException({
        message: [`validation.survey.NOT_FOUND|{"id":"${id}"}`],
      });
    }
    return survey;
  }

  async getById(id: number, useCache = true): Promise<SurveyModel> {
    let cacheKey = null;
    let survey: SurveyModel = null;
    if (useCache) {
      cacheKey = `${this.cacheKey}${id}`;
      survey = await this.redisService.get<SurveyModel>(cacheKey);
      if (survey) {
        return survey;
      }
    }
    const query = await this.getBasicQuery();
    const surveyQry = await query.where('id = :id', { id }).getRawOne();
    if (!surveyQry) {
      return null;
    }
    survey = this.toModel(surveyQry, true);
    if (cacheKey) {
      await this.redisService.set<SurveyModel>(
        cacheKey,
        survey,
        this.cacheTime,
      );
    }
    return survey;
  }

  async canUpdate(id: number, onErrorFail = true): Promise<SurveyModel> {
    const survey = await this.getByIdOrFail(id);
    if (survey.active && onErrorFail) {
      throw new NotFoundException({
        message: [`validation.raffle.NOT_FOUND|{"id":"${id}"}`],
      });
    }
    return survey;
  }

  async setActive(
    id: number,
    active: boolean,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em ? em.getRepository(Survey) : this.surveyEntity;
    const result = await repo.update({ id }, { active });
    await this.cleanCacheData(id);
    return result.affected > 0;
  }

  areSame(survey1: SurveyModel, survey2: SurveyUpdateModel): boolean {
    return (
      (survey2.name === undefined || survey1.name === survey2.name) &&
      (survey2.description === undefined ||
        survey1.description === survey2.description) &&
      (survey2.calcRisks === undefined ||
        survey1.calcRisks === survey2.calcRisks) &&
      (survey2.active === undefined || survey1.active === survey2.active)
    );
  }

  private toModelPanel(entity: Survey, isForDetails = false): SurveyModel {
    const model: SurveyModel = new SurveyModel();

    if (!isForDetails) {
      model.id = Number(entity.id);
    }

    model.name = entity.name;
    model.description = entity.description;
    model.calcRisks = entity.calcRisks;
    model.active = entity.active;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;

    return model;
  }

  private toModel(entity: Survey, isForPanel = false): SurveyModel {
    const model: SurveyModel = new SurveyModel();

    if (!isForPanel) {
      model.id = Number(entity.id);
    }
    model.name = entity.name;
    model.description = entity.description;
    model.calcRisks = entity.calcRisks;
    model.active = entity.active;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;

    return model;
  }
}
