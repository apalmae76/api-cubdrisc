import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PersonSurveyAnswersCreateModel,
  PersonSurveyAnswersModel,
} from 'src/domain/model/personSurveyAnswers';
import { IPersonSurveyAnswersRepository } from 'src/domain/repositories/personSurveyAnswersRepository.interface';
import { EntityManager, Repository } from 'typeorm';
import { GetGenericAllDto } from '../common/dtos/genericRepo-dto.class';
import { PageDto } from '../common/dtos/page.dto';
import { PageMetaDto } from '../common/dtos/pageMeta.dto';
import { PersonSurveyAnswers } from '../entities/person-survey-answers.entity';
import { ApiLoggerService } from '../services/logger/logger.service';
import { ApiRedisService } from '../services/redis/redis.service';
import { BaseRepository } from './base.repository';
@Injectable()
export class DatabasePersonSurveyAnswersRepository
  extends BaseRepository
  implements IPersonSurveyAnswersRepository {
  private readonly cacheKey = 'Repository:PersonSurveyAnswers:';
  private readonly cacheTime = 15 * 60; // 15 mins
  constructor(
    @InjectRepository(PersonSurveyAnswers)
    private readonly surveyQPAEntity: Repository<PersonSurveyAnswers>,
    private readonly redisService: ApiRedisService,
    protected readonly logger: ApiLoggerService,
  ) {
    super(surveyQPAEntity, logger);
  }

  async create(
    data: PersonSurveyAnswersCreateModel,
    em: EntityManager,
  ): Promise<PersonSurveyAnswersModel> {
    const repo = em
      ? em.getRepository(PersonSurveyAnswers)
      : this.surveyQPAEntity;
    const entity = this.toCreate(data);
    const dataSaved = await repo.save(entity);
    this.cleanCacheData(data);
    return this.toModel(dataSaved);
  }

  private toCreate(model: PersonSurveyAnswersCreateModel): PersonSurveyAnswers {
    const entity = new PersonSurveyAnswers();

    entity.personId = model.personId;
    entity.surveyId = model.surveyId;
    entity.personSurveyId = model.personSurveyId;
    entity.surveyQuestionId = model.surveyQuestionId;
    entity.surveyQuestionAnswerId = model.surveyQuestionAnswerId;

    return entity;
  }

  private async cleanCacheData({
    personId,
    surveyId,
    personSurveyId,
    surveyQuestionId,
    surveyQuestionAnswerId,
  }: {
    personId: number;
    surveyId: number;
    personSurveyId: number;
    surveyQuestionId: number;
    surveyQuestionAnswerId: number;
  }) {
    const cacheKey = `${this.cacheKey}${personId}:${surveyId}:${personSurveyId}:${surveyQuestionId}:${surveyQuestionAnswerId}`;
    await this.redisService.del(cacheKey);
  }

  private getBasicQuery() {
    return this.surveyQPAEntity
      .createQueryBuilder('psa')
      .select([
        'psa.person_id as "personId"',
        'psa.survey_id as "surveyId"',
        'psa.person_survey_id as "personSurveyId"',
        'psa.survey_question_id as "surveyQuestionId"',
        'psa.survey_question_answer_id as "surveyQuestionAnswerId"',
        'psa.created_at as "createdAt"',
      ])
      .withDeleted();
  }

  async getByIdForPanel(
    personId: number,
    surveyId: number,
    personSurveyId: number,
    surveyQuestionId: number,
    surveyQuestionAnswerId: number,
  ): Promise<PersonSurveyAnswersModel> {
    const query = this.getBasicQuery();
    query.where(
      `personId = :personId and surveyId = :surveyId and personSurveyId = :personSurveyId and
        surveyQuestionId = :surveyQuestionId and surveyQuestionAnswerId = :surveyQuestionAnswerId`,
      {
        personId,
        surveyId,
        personSurveyId,
        surveyQuestionId,
        surveyQuestionAnswerId,
      },
    );
    const survey = await query.getRawOne();
    if (!survey) {
      return null;
    }
    return this.toModelPanel(survey);
  }

  async getByQuery(
    queryDto: GetGenericAllDto,
  ): Promise<PageDto<PersonSurveyAnswersModel>> {
    const queryList = this.getBasicQuery();

    const query = await super.getByQueryBase<PersonSurveyAnswersModel>(
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
    personId: number,
    surveyId: number,
    personSurveyId: number,
    surveyQuestionId: number,
    surveyQuestionAnswerId: number,
  ) {
    await this.getByIdOrFail(
      personId,
      surveyId,
      personSurveyId,
      surveyQuestionId,
      surveyQuestionAnswerId,
    );
  }

  async getByIdOrFail(
    personId: number,
    surveyId: number,
    personSurveyId: number,
    surveyQuestionId: number,
    surveyQuestionAnswerId: number,
  ): Promise<PersonSurveyAnswersModel> {
    const survey = await this.getById(
      personId,
      surveyId,
      personSurveyId,
      surveyQuestionId,
      surveyQuestionAnswerId,
    );
    if (!survey) {
      throw new NotFoundException({
        message: [
          `validation.person_survey_answer.NOT_FOUND|{"surveyId":"${surveyId}","surveyQuestionId":"${surveyQuestionId}","surveyQuestionAnswerId":"${surveyQuestionAnswerId}"}`,
        ],
      });
    }
    return survey;
  }

  async getById(
    personId: number,
    surveyId: number,
    personSurveyId: number,
    surveyQuestionId: number,
    surveyQuestionAnswerId: number,
    useCache = true,
  ): Promise<PersonSurveyAnswersModel> {
    let cacheKey = null;
    let personSurvAns: PersonSurveyAnswersModel = null;
    if (useCache) {
      cacheKey = `${this.cacheKey}${personId}:${surveyId}:${personSurveyId}:${surveyQuestionId}:${surveyQuestionAnswerId}`;
      personSurvAns =
        await this.redisService.get<PersonSurveyAnswersModel>(cacheKey);
      if (personSurvAns) {
        return personSurvAns;
      }
    }
    const query = await this.getBasicQuery();
    const survQPAQry = await query
      .where(
        `psa.person_id = :personId and psa.survey_id = :surveyId and psa.person_survey_id = :personSurveyId and
          psa.survey_question_id = :surveyQuestionId and psa.survey_question_answer_id = :surveyQuestionAnswerId`,
        {
          personId,
          surveyId,
          personSurveyId,
          surveyQuestionId,
          surveyQuestionAnswerId,
        },
      )
      .getRawOne();
    console.log('----');
    console.log(survQPAQry);
    console.log('----');
    if (!survQPAQry) {
      return null;
    }
    personSurvAns = this.toModel(survQPAQry);
    if (cacheKey) {
      await this.redisService.set<PersonSurveyAnswersModel>(
        cacheKey,
        personSurvAns,
        this.cacheTime,
      );
    }
    return personSurvAns;
  }

  async isAnswer(
    personId: number,
    surveyId: number,
    personSurveyId: number,
    surveyQuestionId: number,
    surveyQuestionAnswerId: number,
    useCache = true,
  ): Promise<boolean> {
    const survQPAQry = await this.getById(
      personId,
      surveyId,
      personSurveyId,
      surveyQuestionId,
      surveyQuestionAnswerId,
      useCache,
    );

    return survQPAQry ? true : false;
  }

  private toModelPanel(
    entity: PersonSurveyAnswersModel,
  ): PersonSurveyAnswersModel {
    const model = new PersonSurveyAnswersModel();

    model.personId = Number(entity.personId);
    model.surveyId = Number(entity.surveyId);
    model.personSurveyId = Number(entity.personSurveyId);
    model.surveyQuestionId = Number(entity.surveyQuestionId);
    model.surveyQuestionAnswerId = Number(entity.surveyQuestionAnswerId);

    model.createdAt = entity.createdAt;

    return model;
  }

  private toModel(entity: PersonSurveyAnswersModel): PersonSurveyAnswersModel {
    const model = new PersonSurveyAnswersModel();

    model.personId = Number(entity.personId);
    model.surveyId = Number(entity.surveyId);
    model.personSurveyId = Number(entity.personSurveyId);
    model.surveyQuestionId = Number(model.surveyQuestionId);
    model.surveyQuestionAnswerId = Number(model.surveyQuestionAnswerId);

    model.createdAt = entity.createdAt;

    return model;
  }
}
