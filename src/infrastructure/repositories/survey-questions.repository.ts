import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AnswerCountByQuestions,
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
import { extractErrorDetails } from '../common/utils/extract-error-details';
import { SurveyQuestions } from '../entities/survey-questions.entity';
import { IApiLogger } from '../services/logger/logger.interface';
import { API_LOGGER_KEY } from '../services/logger/logger.module';
import { REDIS_SERVICE_KEY } from '../services/redis/redis.module';
import { ApiRedisService } from '../services/redis/redis.service';
import { BaseRepository } from './base.repository';
import { DatabaseSurveyRepository } from './survey.repository';
import { SurveyQuestionsPossibleAnswers } from '../entities/survey-questions-possible-answers.entity';
@Injectable()
export class DatabaseSurveyQuestionsRepository
  extends BaseRepository
  implements ISurveyQuestionsRepository
{
  private readonly cacheKey = 'Repository:SurveyQuestions:';
  private readonly cacheTime = 15 * 60; // 15 mins
  constructor(
    @InjectRepository(SurveyQuestions)
    private readonly surveyQuestionEntity: Repository<SurveyQuestions>,
    @Inject(REDIS_SERVICE_KEY) private readonly redisService: ApiRedisService,
    @Inject(API_LOGGER_KEY) protected readonly logger: IApiLogger,
    private readonly surveyRepo: DatabaseSurveyRepository,
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
    try {
      const entity = await this.toCreate(data);
      const dataSaved = await repo.save(entity);
      return this.toModel(dataSaved);
    } catch (er: unknown) {
      await this.manageErrors(data, er);
      throw er;
    }
  }

  private async manageErrors(
    newData: SurveyQuestionCreateModel | SurveyQuestionUpdateModel,
    er: unknown,
  ) {
    const { message } = extractErrorDetails(er);

    if (message) {
      if (message.includes('IDX_UNIQUE_SURVEY_QUESTION_QUESTION')) {
        const addInfo = {
          technicalError: `Question exists, text must be unique (${newData.question}), check`,
          answer: newData.question,
        };
        throw new BadRequestException({
          message: [
            `validation.survey_question.DESCRIPTION_IS_UNIQUE|${JSON.stringify(addInfo)}`,
          ],
        });
      } else if (message.includes('IDX_2bf050efd8e08697270364a7f6')) {
        const addInfo = {
          technicalError: `Order number must be unique (${newData.order}), check`,
          order: newData.order,
        };
        throw new BadRequestException({
          message: [
            `validation.survey_question.ORDER_IS_UNIQUE|${JSON.stringify(addInfo)}`,
          ],
        });
      } else if (message.includes('FK_895ad6ec351b200c52c8d1ec099')) {
        const addInfo = {
          technicalError: `Survey most exists (${newData.surveyId}), check`,
          question: newData.question,
        };
        throw new BadRequestException({
          message: [`validation.survey.NOT_FOUND|${JSON.stringify(addInfo)}`],
        });
      }
    }
  }

  private async toCreate(
    model: SurveyQuestionCreateModel,
  ): Promise<SurveyQuestions> {
    const entity = new SurveyQuestions();

    entity.surveyId = model.surveyId;
    entity.question = model.question;
    entity.order = await this.getLastOrder(model.surveyId);
    entity.required = model.required ?? false;
    entity.gender = model.gender ?? 'Ambos';

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
    try {
      const update = await repo.update({ surveyId, id }, surveyQuestion);
      if (update.affected > 0) {
        await this.cleanCacheData(surveyId);
        return true;
      }
      return false;
    } catch (er: unknown) {
      await this.manageErrors(surveyQuestion, er);
      throw er;
    }
  }

  async delete(
    surveyId: number,
    id: number,
    em: EntityManager = null,
  ): Promise<boolean> {
    const repo = em
      ? em.getRepository(SurveyQuestions)
      : this.surveyQuestionEntity;

    const { affected } = await repo.delete({ surveyId, id });
    if (affected > 0) {
      await this.cleanCacheData(surveyId);
      return true;
    }
    return false;
  }

  async deleteBySurveyId(
    surveyId: number,
    em: EntityManager = null,
  ): Promise<boolean> {
    const repo = em
      ? em.getRepository(SurveyQuestions)
      : this.surveyQuestionEntity;

    const { affected } = await repo.delete({ surveyId });

    if (affected > 0) {
      await this.cleanCacheData(surveyId);
      return true;
    }
    return false;
  }

  async getCount(surveyId: number): Promise<number> {
    return await this.surveyQuestionEntity
      .createQueryBuilder()
      .where('survey_id = :surveyId', { surveyId })
      .getCount();
  }

  async cleanCacheData(surveyId: number) {
    const cacheKey = `${this.cacheKey}${surveyId}`;
    await this.redisService.del(cacheKey);
    const pattern = `${this.cacheKey}${surveyId}:*`;
    await this.redisService.removeAllKeysWithPattern(pattern);
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
        'sq.gender as "gender"',
        'sq.created_at as "createdAt"',
        'sq.updated_at as "updatedAt"',
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

    const query = await super.getByQueryBase<SurveyQuestions>({
      queryDto,
      alias: 'sq',
      queryList,
    });

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
      cacheKey = `${this.cacheKey}${surveyId}:${id}`;
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

  async getIds(
    surveyId: number,
    gender: string,
    useCache = true,
  ): Promise<number[]> {
    const cacheKey = `${this.cacheKey}${surveyId}:${gender}:Ids`;
    let questionIds: number[] = [];
    if (useCache) {
      questionIds = await this.redisService.get<number[]>(cacheKey);
      if (questionIds) {
        return questionIds;
      }
    }
    const query = this.getBasicQuery();
    const survQuestionQry = await query
      .where(`sq.survey_id = :surveyId and sq.gender in (:gender, 'Ambos')`, {
        surveyId,
        gender,
      })
      .orderBy('sq.order', 'ASC')
      .getRawMany();
    if (!survQuestionQry) {
      return [];
    }
    questionIds = survQuestionQry.map((question) => Number(question.id));
    if (cacheKey) {
      await this.redisService.set<number[]>(
        cacheKey,
        questionIds,
        this.cacheTime,
      );
    }
    return questionIds;
  }

  async canUpdate(surveyId: number, id: number): Promise<SurveyQuestionModel> {
    await this.surveyRepo.ensureIsDraftOrFail(surveyId);
    const question = await this.getByIdOrFail(surveyId, id);
    return question;
  }

  async getAnswerCountByQuestions(
    surveyId: number,
  ): Promise<AnswerCountByQuestions[]> {
    const answers = await this.surveyQuestionEntity
      .createQueryBuilder('sq')
      .select([
        'sq.survey_id as "surveyId"',
        'count(sqa.id) as "cAnswers"',
        'min(sqa.value) as "minValue"',
        'max(sqa.value) as "maxValue"',
      ])
      .leftJoin(
        SurveyQuestionsPossibleAnswers,
        'sqa',
        'sqa.survey_id = sq.survey_id and sqa.survey_question_id = sq.id',
      )
      .where('sq.survey_id = :surveyId', { surveyId })
      .groupBy('sq.survey_id, sq.id, sq.order')
      .orderBy('sq.order')
      .getRawMany();
    return answers.map((qAnswer) => {
      const qAnswerCount: AnswerCountByQuestions = {
        cAnswer: Number(qAnswer.cAnswers),
        minValue: Number(qAnswer.minValue),
        maxValue: Number(qAnswer.maxValue),
      };
      return qAnswerCount;
    });
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

    return questions.map((question) => this.toModel(question));
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
    await this.cleanCacheData(surveyId);
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
      (survey2.required === undefined ||
        survey1.required === survey2.required) &&
      (survey2.gender === undefined || survey1.gender === survey2.gender)
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
    model.gender = entity.gender;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;

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
    model.gender = entity.gender;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;

    return model;
  }
}
