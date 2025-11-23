import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ListToUpdOrderModel,
  SurveyQuestionCreateModel,
  SurveyQuestionModel,
  SurveyQuestionUpdateModel,
} from 'src/domain/model/surveyQuestion';
import { ISurveyQuestionsRepository } from 'src/domain/repositories/surveyQuestionRepository.interface';
import { EntityManager, Repository } from 'typeorm';
import { GetGenericAllDto } from '../common/dtos/genericRepo-dto.class';
import { PageDto } from '../common/dtos/page.dto';
import { PageMetaDto } from '../common/dtos/pageMeta.dto';
import { SurveyQuestions } from '../entities/survey-questions.entity';
import { ApiLoggerService } from '../services/logger/logger.service';
import { ApiRedisService } from '../services/redis/redis.service';
import { BaseRepository } from './base.repository';
@Injectable()
export class DatabaseSurveyQuestionsRepository
  extends BaseRepository
  implements ISurveyQuestionsRepository {
  private readonly cacheKey = 'Repository:SurveyQuestions:';
  private readonly cacheTime = 15 * 60; // 15 mins
  constructor(
    @InjectRepository(SurveyQuestions)
    private readonly surveyQuestionEntity: Repository<SurveyQuestions>,
    private readonly redisService: ApiRedisService,
    protected readonly logger: ApiLoggerService,
  ) {
    super(surveyQuestionEntity, logger);
  }

  async create(
    data: SurveyQuestionCreateModel,
    em: EntityManager,
  ): Promise<SurveyQuestionModel> {
    const repo = em
      ? em.getRepository(SurveyQuestions)
      : this.surveyQuestionEntity;
    const entity = await this.toCreate(data);
    const dataSaved = await repo.save(entity);
    return this.toModel(dataSaved);
  }

  private async toCreate(
    model: SurveyQuestionCreateModel,
  ): Promise<SurveyQuestions> {
    const entity = new SurveyQuestions();

    entity.surveyId = model.surveyId;
    entity.question = model.question;
    entity.order = await this.getLastOrder(model.surveyId);
    entity.required = model.required ?? false;

    return entity;
  }

  async getLastOrder(surveyId: number): Promise<number> {
    const maxQuery = await this.surveyQuestionEntity
      .createQueryBuilder('sq')
      .select('max(sq.order) as "maxOrder"')
      .where('survey_id = :surveyId', { surveyId })
      .getRawOne();
    return maxQuery ? maxQuery.maxOrder + 1 : 1;
  }

  async update(
    surveyId: number,
    id: number,
    surveyQuestion: SurveyQuestionUpdateModel,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em
      ? em.getRepository(SurveyQuestions)
      : this.surveyQuestionEntity;
    const update = await repo.update({ surveyId, id }, surveyQuestion);
    if (update.affected > 0) {
      await this.cleanCacheData(surveyId);
      return true;
    }
    return false;
  }

  async softDelete(
    surveyId: number,
    id: number,
    em: EntityManager = null,
  ): Promise<boolean> {
    const repo = em
      ? em.getRepository(SurveyQuestions)
      : this.surveyQuestionEntity;

    const { affected } = await repo
      .createQueryBuilder()
      .update(SurveyQuestions)
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
      const rowIsDeleted = await this.isRowDeleted(surveyId, id);
      if (rowIsDeleted === null) {
        this.logger.warn(
          `Survey questions repository, soft delete: Sended id does not exist `,
          {
            affected,
            rowIsDeleted: rowIsDeleted ? rowIsDeleted : 'NULL',
            context: `${DatabaseSurveyQuestionsRepository.name}.softDelete`,
          },
        );
      }
      return false;
    }
  }

  private async isRowDeleted(surveyId: number, id: number): Promise<boolean> {
    const row = await this.surveyQuestionEntity
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
    return await this.surveyQuestionEntity
      .createQueryBuilder()
      .where('survey_id = :surveyId', { surveyId })
      .getCount();
  }

  async cleanCacheData(surveyId: number) {
    const keyPattern = `${this.cacheKey}${surveyId}*`;
    await this.redisService.removeAllKeysWithPattern(keyPattern);
  }

  private getBasicQuery() {
    return this.surveyQuestionEntity
      .createQueryBuilder('sq')
      .select([
        'sq.survey_id as "surveyId"',
        'sq.id as "id"',
        'sq.question as "question"',
        'sq.order as "order"',
        'sq.required as "required"',
        'sq.created_at as "createdAt"',
        'sq.updated_at as "updatedAt"',
        'sq.deleted_at as "deletedAt"',
      ])
      .withDeleted();
  }

  async getByIdForPanel(
    surveyId: number,
    id: number,
  ): Promise<SurveyQuestionModel> {
    const query = this.getBasicQuery();
    query.where('survey_id = :surveyId and id = :id', { surveyId, id });
    const survey = await query.getRawOne();
    if (!survey) {
      return null;
    }
    return this.toModelPanel(survey, true);
  }

  async getByQuery(
    queryDto: GetGenericAllDto,
  ): Promise<PageDto<SurveyQuestionModel>> {
    const queryList = this.getBasicQuery();

    const query = await super.getByQueryBase<SurveyQuestions>(
      queryDto,
      'sq',
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

  async ensureExistOrFail(surveyId: number, id: number) {
    await this.getByIdOrFail(surveyId, id);
  }

  async getByIdOrFail(
    surveyId: number,
    id: number,
  ): Promise<SurveyQuestionModel> {
    const question = await this.getById(surveyId, id);
    if (!question) {
      throw new NotFoundException({
        message: [
          `validation.survey_question.NOT_FOUND|{"surveyId":"${surveyId}","id":"${id}"}`,
        ],
      });
    }
    return question;
  }

  async getById(
    surveyId: number,
    id: number,
    useCache = true,
  ): Promise<SurveyQuestionModel> {
    let cacheKey = null;
    let survQuestion: SurveyQuestionModel = null;
    if (useCache) {
      cacheKey = `${this.cacheKey}${id}`;
      survQuestion = await this.redisService.get<SurveyQuestionModel>(cacheKey);
      if (survQuestion) {
        return survQuestion;
      }
    }
    const query = this.getBasicQuery();
    const survQuestionQry = await query
      .where('survey_id = :surveyId and id = :id', { surveyId, id })
      .getRawOne();
    if (!survQuestionQry) {
      return null;
    }
    survQuestion = this.toModel(survQuestionQry, true);
    if (cacheKey) {
      await this.redisService.set<SurveyQuestionModel>(
        cacheKey,
        survQuestion,
        this.cacheTime,
      );
    }
    return survQuestion;
  }

  async canUpdate(surveyId: number, id: number): Promise<SurveyQuestionModel> {
    const question = await this.getByIdOrFail(surveyId, id);
    return question;
  }

  async getToMove(
    surveyId: number,
    id: number,
    order: number,
  ): Promise<ListToUpdOrderModel[]> {
    const questions = await this.surveyQuestionEntity
      .createQueryBuilder('sq')
      .select(['sq.id as "id"', 'sq.order as "order"'])
      .where('survey_id = :surveyId and sq.id <> :id and sq.order >= :order', {
        surveyId,
        id,
        order,
      })
      .orderBy('sq.order', 'ASC')
      .getRawMany();

    return questions.map((question) => this.toModel(question, true));
  }

  async setOrder(
    surveyId: number,
    id: number,
    order: number,
    em: EntityManager,
  ): Promise<void> {
    const repo = em
      ? em.getRepository(SurveyQuestions)
      : this.surveyQuestionEntity;
    await repo.update({ surveyId, id }, { order });
  }

  areSame(
    survey1: SurveyQuestionModel,
    survey2: SurveyQuestionUpdateModel,
  ): boolean {
    return (
      (survey2.surveyId === undefined ||
        survey1.surveyId === survey2.surveyId) &&
      (survey2.question === undefined ||
        survey1.question === survey2.question) &&
      (survey2.order === undefined || survey1.order === survey2.order) &&
      (survey2.required === undefined || survey1.required === survey2.required)
    );
  }

  private toModelPanel(
    entity: SurveyQuestions,
    isForDetails = false,
  ): SurveyQuestionModel {
    const model = new SurveyQuestionModel();

    model.surveyId = Number(entity.surveyId);

    if (!isForDetails) {
      model.id = Number(entity.id);
    }

    model.question = entity.question;
    model.order = entity.order;
    model.required = entity.required;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;

    return model;
  }

  private toModel(
    entity: SurveyQuestions,
    isForPanel = false,
  ): SurveyQuestionModel {
    const model = new SurveyQuestionModel();

    model.surveyId = Number(entity.surveyId);

    if (!isForPanel) {
      model.id = Number(entity.id);
    }
    model.surveyId = entity.surveyId;
    model.question = entity.question;
    model.order = Number(entity.order);
    model.required = entity.required;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;

    return model;
  }
}
