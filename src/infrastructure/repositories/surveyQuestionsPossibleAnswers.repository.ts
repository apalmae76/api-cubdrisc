import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  SurveyQuestionPossibleAnswerCreateModel,
  SurveyQuestionPossibleAnswerModel,
  SurveyQuestionPossibleAnswerUpdateModel,
} from 'src/domain/model/surveyQuestionPossibleAnswers';
import { ISurveyQuestionsPossibleAnswersRepository } from 'src/domain/repositories/surveyQuestionPossibleAnswersRepository.interface';
import { EntityManager, Repository } from 'typeorm';
import { GetGenericAllDto } from '../common/dtos/genericRepo-dto.class';
import { PageDto } from '../common/dtos/page.dto';
import { PageMetaDto } from '../common/dtos/pageMeta.dto';
import { Survey } from '../entities/survey.entity';
import { SurveyQuestionsPossibleAnswers } from '../entities/surveyQuestionsPossibleAnswers.entity';
import { ApiLoggerService } from '../services/logger/logger.service';
import { ApiRedisService } from '../services/redis/redis.service';
import { BaseRepository } from './base.repository';
@Injectable()
export class DatabaseSurveyQuestionsPossibleAnswersRepository
  extends BaseRepository
  implements ISurveyQuestionsPossibleAnswersRepository {
  private readonly cacheKey = 'Repository:SurveyQuestionsPossibleAnswers:';
  private readonly cacheTime = 15 * 60; // 15 mins
  constructor(
    @InjectRepository(SurveyQuestionsPossibleAnswers)
    private readonly surveyQPAEntity: Repository<SurveyQuestionsPossibleAnswers>,
    private readonly redisService: ApiRedisService,
    protected readonly logger: ApiLoggerService,
  ) {
    super(surveyQPAEntity, logger);
  }

  async create(
    data: SurveyQuestionPossibleAnswerCreateModel,
    em: EntityManager,
  ): Promise<SurveyQuestionPossibleAnswerModel> {
    const repo = em
      ? em.getRepository(SurveyQuestionsPossibleAnswers)
      : this.surveyQPAEntity;
    const entity = this.toCreate(data);
    const dataSaved = await repo.save(entity);
    return this.toModel(dataSaved);
  }

  private toCreate(
    model: SurveyQuestionPossibleAnswerCreateModel,
  ): SurveyQuestionsPossibleAnswers {
    const entity = new SurveyQuestionsPossibleAnswers();

    entity.surveyId = model.surveyId;
    entity.surveyQuestionId = model.surveyQuestionId;
    entity.answer = model.answer;
    entity.educationalTip = model.educationalTip;
    entity.order = model.order;

    return entity;
  }

  async updateIfExistOrFail(
    surveyId: number,
    surveyQuestionId: number,
    id: number,
    surveyQuestion: SurveyQuestionPossibleAnswerUpdateModel,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em ? em.getRepository(Survey) : this.surveyQPAEntity;
    const entity = await repo.findOne({
      where: { surveyId, surveyQuestionId, id },
    });
    if (!entity) {
      throw new NotFoundException({
        message: [
          `validation.survey_question_pa.NOT_FOUND|{"surveyId":"${surveyId}","surveyQuestionId":"${surveyQuestionId}","id":"${id}"}`,
        ],
      });
    }
    const update = await repo.update(
      { surveyId, surveyQuestionId, id },
      surveyQuestion,
    );
    if (update.affected > 0) {
      await this.cleanCacheData(surveyId, surveyQuestionId, id);
    }
    return true;
  }

  async softDelete(
    surveyId: number,
    surveyQuestionId: number,
    id: number,
    em: EntityManager = null,
  ): Promise<boolean> {
    const repo = em ? em.getRepository(Survey) : this.surveyQPAEntity;

    const { affected } = await repo
      .createQueryBuilder()
      .update(SurveyQuestionsPossibleAnswers)
      .set({ deletedAt: new Date() })
      .where(
        'surveyId = :surveyId and surveyQuestionId = :surveyQuestionId and id = :id and deleted_at is null',
        { surveyId, surveyQuestionId, id },
      )
      .execute();
    if (affected > 0) {
      await this.cleanCacheData(surveyId, surveyQuestionId, id);
      return true;
    } else {
      const rowIsDeleted = await this.isRowDeleted(
        surveyId,
        surveyQuestionId,
        id,
      );
      if (rowIsDeleted === null) {
        this.logger.warn(
          `Survey questions repository, soft delete: Sended id does not exist `,
          {
            affected,
            rowIsDeleted: rowIsDeleted ? rowIsDeleted : 'NULL',
            context: `${DatabaseSurveyQuestionsPossibleAnswersRepository.name}.softDelete`,
          },
        );
      }
      return false;
    }
  }

  private async isRowDeleted(
    surveyId: number,
    surveyQuestionId: number,
    id: number,
  ): Promise<boolean> {
    const row = await this.surveyQPAEntity
      .createQueryBuilder()
      .select(['deleted_at as "deletedAt"'])
      .withDeleted()
      .where(
        'surveyId = :surveyId and surveyQuestionId = :surveyQuestionId and id = :id',
        { surveyId, surveyQuestionId, id },
      )
      .getRawOne();
    if (row) {
      return row.deletedAt !== null;
    }
    return null;
  }

  private async cleanCacheData(
    surveyId: number,
    surveyQuestionId: number,
    id: number,
  ) {
    const cacheKey = `${this.cacheKey}${surveyId}:${surveyQuestionId}:${id}`;
    await this.redisService.del(cacheKey);
  }

  private getBasicQuery() {
    return this.surveyQPAEntity
      .createQueryBuilder('sq')
      .select([
        'sq.survey_id as "surveyId"',
        'sq.survey_question_id as "surveyQuestionId"',
        'sq.id as "id"',
        'sq.answer as "answer"',
        'sq.educational_tip as "educationalTip"',
        'sq.order as "order"',
        'sq.created_at as "createdAt"',
        'sq.updated_at as "updatedAt"',
        'sq.deleted_at as "deletedAt"',
      ])
      .withDeleted();
  }

  async getByIdForPanel(
    surveyId: number,
    surveyQuestionId: number,
    id: number,
  ): Promise<SurveyQuestionPossibleAnswerModel> {
    const query = this.getBasicQuery();
    query.where(
      'surveyId = :surveyId and surveyQuestionId = :surveyQuestionId and id = :id',
      { surveyId, surveyQuestionId, id },
    );
    const survey = await query.getRawOne();
    if (!survey) {
      return null;
    }
    return this.toModelPanel(survey, true);
  }

  async getByQuery(
    queryDto: GetGenericAllDto,
  ): Promise<PageDto<SurveyQuestionPossibleAnswerModel>> {
    const queryList = this.getBasicQuery();

    const query = await super.getByQueryBase<SurveyQuestionsPossibleAnswers>(
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

  async ensureExistOrFail(
    surveyId: number,
    surveyQuestionId: number,
    id: number,
  ) {
    await this.getByIdOrFail(surveyId, surveyQuestionId, id);
  }

  async getByIdOrFail(
    surveyId: number,
    surveyQuestionId: number,
    id: number,
  ): Promise<SurveyQuestionPossibleAnswerModel> {
    const survey = await this.getById(surveyId, surveyQuestionId, id);
    if (!survey) {
      throw new NotFoundException({
        message: [
          `validation.survey_question_pa.NOT_FOUND|{"surveyId":"${surveyId}","surveyQuestionId":"${surveyQuestionId}","id":"${id}"}`,
        ],
      });
    }
    return survey;
  }

  async getById(
    surveyId: number,
    surveyQuestionId: number,
    id: number,
    useCache = true,
  ): Promise<SurveyQuestionPossibleAnswerModel> {
    let cacheKey = null;
    let survQPA: SurveyQuestionPossibleAnswerModel = null;
    if (useCache) {
      cacheKey = `${this.cacheKey}${id}`;
      survQPA =
        await this.redisService.get<SurveyQuestionPossibleAnswerModel>(
          cacheKey,
        );
      if (survQPA) {
        return survQPA;
      }
    }
    const query = await this.getBasicQuery();
    const survQPAQry = await query
      .where(
        'surveyId = :surveyId and surveyQuestionId = :surveyQuestionId and id = :id',
        { surveyId, surveyQuestionId, id },
      )
      .getRawOne();
    if (!survQPAQry) {
      return null;
    }
    survQPA = this.toModel(survQPAQry, true);
    if (cacheKey) {
      await this.redisService.set<SurveyQuestionPossibleAnswerModel>(
        cacheKey,
        survQPA,
        this.cacheTime,
      );
    }
    return survQPA;
  }

  async setActive(
    surveyId: number,
    surveyQuestionId: number,
    id: number,
    active: boolean,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em ? em.getRepository(Survey) : this.surveyQPAEntity;
    const result = await repo.update(
      { surveyId, surveyQuestionId, id },
      { active },
    );
    await this.cleanCacheData(surveyId, surveyQuestionId, id);
    return result.affected > 0;
  }

  areSame(
    survey1: SurveyQuestionsPossibleAnswers,
    survey2: SurveyQuestionPossibleAnswerModel,
  ): boolean {
    return (
      (survey2.surveyId === undefined ||
        survey1.surveyId === survey2.surveyId) &&
      (survey2.surveyQuestionId === undefined ||
        survey1.surveyQuestionId === survey2.surveyQuestionId) &&
      (survey2.answer === undefined || survey1.answer === survey2.answer) &&
      (survey2.educationalTip === undefined ||
        survey1.educationalTip === survey2.educationalTip) &&
      (survey2.order === undefined || survey1.order === survey2.order)
    );
  }

  private toModelPanel(
    entity: SurveyQuestionsPossibleAnswers,
    isForDetails = false,
  ): SurveyQuestionPossibleAnswerModel {
    const model = new SurveyQuestionPossibleAnswerModel();

    model.surveyId = Number(entity.surveyId);
    model.surveyQuestionId = Number(model.surveyQuestionId);

    if (!isForDetails) {
      model.id = Number(entity.id);
    }

    model.answer = entity.answer;
    model.educationalTip = entity.educationalTip;
    model.order = entity.order;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;

    return model;
  }

  private toModel(
    entity: SurveyQuestionsPossibleAnswers,
    isForPanel = false,
  ): SurveyQuestionPossibleAnswerModel {
    const model = new SurveyQuestionPossibleAnswerModel();

    model.surveyId = Number(entity.surveyId);
    model.surveyQuestionId = Number(model.surveyQuestionId);

    if (!isForPanel) {
      model.id = Number(entity.id);
    }
    model.answer = entity.answer;
    model.educationalTip = entity.educationalTip;
    model.order = entity.order;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;

    return model;
  }
}
