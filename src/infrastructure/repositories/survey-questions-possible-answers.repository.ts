import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ListToUpdOrderModel } from 'src/domain/model/surveyQuestion';
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
import { extractErrorDetails } from '../common/utils/extract-error-details';
import { SurveyQuestionsPossibleAnswers } from '../entities/survey-questions-possible-answers.entity';
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
    newData:
      | SurveyQuestionPossibleAnswerCreateModel
      | SurveyQuestionPossibleAnswerUpdateModel,
    er: unknown,
  ) {
    const { message } = extractErrorDetails(er);

    if (message) {
      if (message.includes('IDX_7ef93680307bb863c00dd39e2b')) {
        const addInfo = {
          technicalError: `Answer exists, text must be unique (${newData.answer}), check`,
          answer: newData.answer,
        };
        throw new BadRequestException({
          message: [
            `validation.survey_question_answer.DESCRIPTION_IS_UNIQUE|${JSON.stringify(addInfo)}`,
          ],
        });
      } else if (message.includes('IDX_1d6ea7fdd9673934ff83bd61a1')) {
        const addInfo = {
          technicalError: `Order number must be unique (${newData.order}), check`,
          order: newData.order,
        };
        throw new BadRequestException({
          message: [
            `validation.survey_question_answer.ORDER_IS_UNIQUE|${JSON.stringify(addInfo)}`,
          ],
        });
      } else if (message.includes('FK_39fbfa087ef7fbf9718a6dbe8b6')) {
        const addInfo = {
          technicalError: `Survey question most exists (${newData.surveyQuestionId}), check`,
          answer: newData.answer,
        };
        throw new BadRequestException({
          message: [
            `validation.survey_question_answer.NOT_FOUND|${JSON.stringify(addInfo)}`,
          ],
        });
      }
    }
  }

  private async toCreate(
    model: SurveyQuestionPossibleAnswerCreateModel,
  ): Promise<SurveyQuestionsPossibleAnswers> {
    const entity = new SurveyQuestionsPossibleAnswers();

    entity.surveyId = model.surveyId;
    entity.surveyQuestionId = model.surveyQuestionId;
    entity.answer = model.answer;
    entity.educationalTip = model.educationalTip;
    entity.value = model.value;
    entity.order = await this.getLastOrder(
      model.surveyId,
      model.surveyQuestionId,
    );

    return entity;
  }

  async getLastOrder(surveyId: number, questionId: number): Promise<number> {
    const maxQuery = await this.surveyQPAEntity
      .createQueryBuilder('sqa')
      .select('max(sqa.order) as "maxOrder"')
      .where('survey_id = :surveyId and survey_question_id = :questionId', {
        surveyId,
        questionId,
      })
      .getRawOne();
    return maxQuery ? maxQuery.maxOrder + 1 : 1;
  }

  async update(
    surveyId: number,
    surveyQuestionId: number,
    id: number,
    surveyQuestion: SurveyQuestionPossibleAnswerUpdateModel,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em
      ? em.getRepository(SurveyQuestionsPossibleAnswers)
      : this.surveyQPAEntity;
    try {
      const update = await repo.update(
        { surveyId, surveyQuestionId, id },
        surveyQuestion,
      );
      if (update.affected > 0) {
        await this.cleanCacheData(surveyId, surveyQuestionId);
      }
      return true;
    } catch (er: unknown) {
      await this.manageErrors(surveyQuestion, er);
      throw er;
    }
  }

  async softDelete(
    surveyId: number,
    surveyQuestionId: number,
    id: number,
    em: EntityManager = null,
  ): Promise<boolean> {
    const repo = em
      ? em.getRepository(SurveyQuestionsPossibleAnswers)
      : this.surveyQPAEntity;

    const { affected } = await repo
      .createQueryBuilder()
      .update(SurveyQuestionsPossibleAnswers)
      .set({ deletedAt: new Date() })
      .where(
        'survey_id = :surveyId and survey_question_id = :surveyQuestionId and id = :id and deleted_at is null',
        { surveyId, surveyQuestionId, id },
      )
      .execute();
    if (affected > 0) {
      await this.cleanCacheData(surveyId, surveyQuestionId);
      return true;
    } else {
      const rowIsDeleted = await this.isRowDeleted(
        surveyId,
        surveyQuestionId,
        id,
      );
      if (rowIsDeleted === null) {
        this.logger.warn(
          `Survey answer repository, soft delete: Sended id does not exist `,
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
        'survey_id = :surveyId and survey_question_id = :surveyQuestionId and id = :id',
        { surveyId, surveyQuestionId, id },
      )
      .getRawOne();
    if (row) {
      return row.deletedAt !== null;
    }
    return null;
  }

  async getCount(surveyId: number): Promise<number[]> {
    const questionsPACount = await this.surveyQPAEntity
      .createQueryBuilder('sqans')
      .select([
        'survey_question_id as "surveyQuestionId"',
        'count(1) as "count"',
      ])
      .where('survey_id = :surveyId', { surveyId })
      .groupBy('survey_question_id')
      .orderBy('survey_question_id', 'ASC')
      .getRawMany();
    return questionsPACount.map((answer) => Number(answer.count));
  }

  async cleanCacheData(surveyId: number, surveyQuestionId: number) {
    const pattern = `${this.cacheKey}${surveyId}:${surveyQuestionId}*`;
    await this.redisService.removeAllKeysWithPattern(pattern);
  }

  private getBasicQuery() {
    return this.surveyQPAEntity
      .createQueryBuilder('sqa')
      .select([
        'sqa.survey_id as "surveyId"',
        'sqa.survey_question_id as "surveyQuestionId"',
        'sqa.id as "id"',
        'sqa.answer as "answer"',
        'sqa.educational_tip as "educationalTip"',
        'sqa.value as "value"',
        'sqa.order as "order"',
        'sqa.created_at as "createdAt"',
        'sqa.updated_at as "updatedAt"',
        'sqa.deleted_at as "deletedAt"',
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
      'survey_id = :surveyId and survey_question_id = :surveyQuestionId and id = :id',
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

    const query = await super.getByQueryBase<SurveyQuestionsPossibleAnswers>({
      queryDto,
      alias: 'sqa',
      queryList,
    });

    const survQPAs = query.entities.map((survQPA) =>
      this.toModelPanel(survQPA),
    );

    const pageMetaDto = new PageMetaDto({
      total: query.itemCount,
      pageOptionsDto: queryDto,
      itemPageCount: survQPAs.length,
    });

    return new PageDto(survQPAs, pageMetaDto);
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
          `validation.survey_question_answer.NOT_FOUND|{"surveyId":"${surveyId}","surveyQuestionId":"${surveyQuestionId}","id":"${id}"}`,
        ],
      });
    }
    return survey;
  }

  async getAnswers(
    surveyId: number,
    surveyQuestionId: number,
    useCache = true,
  ): Promise<SurveyQuestionPossibleAnswerModel[]> {
    const cacheKey = `${this.cacheKey}${surveyId}:${surveyQuestionId}:answers`;
    let answers: SurveyQuestionPossibleAnswerModel[] = [];
    if (useCache) {
      answers =
        await this.redisService.get<SurveyQuestionPossibleAnswerModel[]>(
          cacheKey,
        );
      if (answers) {
        return answers;
      }
    }
    const query = this.getBasicQuery();
    const survQPAQry = await query
      .where(
        'sqa.survey_id = :surveyId and sqa.survey_question_id = :surveyQuestionId and sqa.deleted_at is null',
        { surveyId, surveyQuestionId },
      )
      .orderBy('sqa.order', 'ASC')
      .getRawMany();
    if (!survQPAQry) {
      return [];
    }
    answers = survQPAQry.map((answer) => this.toModel(answer));
    if (cacheKey) {
      await this.redisService.set<SurveyQuestionPossibleAnswerModel[]>(
        cacheKey,
        answers,
        this.cacheTime,
      );
    }
    return answers;
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
      cacheKey = `${this.cacheKey}${surveyId}:${surveyQuestionId}:${id}`;
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
        'survey_id = :surveyId and survey_question_id = :surveyQuestionId and id = :id',
        { surveyId, surveyQuestionId, id },
      )
      .getRawOne();
    if (!survQPAQry) {
      return null;
    }
    survQPA = this.toModel(survQPAQry);
    if (cacheKey) {
      await this.redisService.set<SurveyQuestionPossibleAnswerModel>(
        cacheKey,
        survQPA,
        this.cacheTime,
      );
    }
    return survQPA;
  }

  async getToMove(
    surveyId: number,
    surveyQuestionId: number,
    id: number,
    order: number,
  ): Promise<ListToUpdOrderModel[]> {
    const answers = await this.surveyQPAEntity
      .createQueryBuilder('sqa')
      .select(['sqa.id as "id"', 'sqa.order as "order"'])
      .where(
        'survey_id = :surveyId and survey_question_id = :surveyQuestionId and sqa.id <> :id and sqa.order >= :order',
        {
          surveyId,
          surveyQuestionId,
          id,
          order,
        },
      )
      .orderBy('sqa.order', 'ASC')
      .getRawMany();

    return answers.map((answer) => this.toModel(answer));
  }

  async canUpdate(
    surveyId: number,
    questionId: number,
    id: number,
  ): Promise<SurveyQuestionPossibleAnswerModel> {
    const answer = await this.getByIdOrFail(surveyId, questionId, id);
    return answer;
  }

  async setOrder(
    surveyId: number,
    surveyQuestionId: number,
    id: number,
    order: number,
    em: EntityManager,
  ): Promise<void> {
    const repo = em
      ? em.getRepository(SurveyQuestionsPossibleAnswers)
      : this.surveyQPAEntity;
    await repo.update({ surveyId, surveyQuestionId, id }, { order });
  }

  private toModelPanel(
    entity: SurveyQuestionsPossibleAnswers,
    isForDetails = false,
  ): SurveyQuestionPossibleAnswerModel {
    const model = new SurveyQuestionPossibleAnswerModel();
    model.surveyId = Number(entity.surveyId);
    model.surveyQuestionId = Number(entity.surveyQuestionId);

    if (!isForDetails) {
      model.id = Number(entity.id);
    }

    model.answer = entity.answer;
    model.educationalTip = entity.educationalTip;
    model.value = entity.value;
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
    model.surveyQuestionId = Number(entity.surveyQuestionId);

    if (!isForPanel) {
      model.id = Number(entity.id);
    }
    model.answer = entity.answer;
    model.educationalTip = entity.educationalTip;
    model.value = entity.value;
    model.order = entity.order;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;

    return model;
  }
}
