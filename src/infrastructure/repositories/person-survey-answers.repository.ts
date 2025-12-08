import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AnswerModel,
  PersonSurveyAnswersCreateModel,
  PersonSurveyAnswersModel,
} from 'src/domain/model/personSurveyAnswers';
import { IPersonSurveyAnswersRepository } from 'src/domain/repositories/personSurveyAnswersRepository.interface';
import { EntityManager, Repository } from 'typeorm';
import { GetGenericAllDto } from '../common/dtos/genericRepo-dto.class';
import { PageDto } from '../common/dtos/page.dto';
import { PageMetaDto } from '../common/dtos/pageMeta.dto';
import { extractErrorDetails } from '../common/utils/extract-error-details';
import { PersonSurveyAnswers } from '../entities/person-survey-answers.entity';
import { SurveyQuestionsPossibleAnswers } from '../entities/survey-questions-possible-answers.entity';
import { SurveyQuestions } from '../entities/survey-questions.entity';
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

  async setAnswer(
    data: PersonSurveyAnswersCreateModel,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em
      ? em.getRepository(PersonSurveyAnswers)
      : this.surveyQPAEntity;
    const {
      personId,
      surveyId,
      personSurveyId,
      surveyQuestionId,
      surveyQuestionAnswerId,
    } = data;
    const questionWasAnswered = await this.questionWasAnswered(
      personId,
      surveyId,
      personSurveyId,
      surveyQuestionId,
    );

    try {
      if (questionWasAnswered) {
        await repo.update(
          { personId, surveyId, personSurveyId, surveyQuestionId },
          { surveyQuestionAnswerId },
        );
      } else {
        await this.create(data, em);
      }
      await this.cleanCacheData({
        personId,
        surveyId,
        personSurveyId,
        surveyQuestionId,
      });
      return true;
    } catch (er: unknown) {
      await this.manageErrors(
        personId,
        surveyId,
        personSurveyId,
        surveyQuestionId,
        surveyQuestionAnswerId,
        er,
      );
      throw er;
    }
  }

  private async manageErrors(
    personId: number,
    surveyId: number,
    personSurveyId: number,
    surveyQuestionId: number,
    surveyQuestionAnswerId: number,
    er: unknown,
  ) {
    const { message } = extractErrorDetails(er);

    if (message) {
      if (message.includes('FK_6cc401cc319009d750ac4d7c87e')) {
        const addInfo = {
          technicalError: `Submitted surveyId (${surveyId}) - personId (${personId}) - personSurveyId (${personSurveyId}); does not exist, check`,
          surveyId,
          personId,
          personSurveyId,
        };
        throw new BadRequestException({
          message: [
            `validation.person_survey.NOT_EXIST_OR_EXPIRED|${JSON.stringify(addInfo)}`,
          ],
        });
      } else if (message.includes('FK_ad1be1c0fbf5b79782079c7e5d1')) {
        const addInfo = {
          technicalError: `Submitted answer (${surveyId}-${surveyQuestionId}-${surveyQuestionAnswerId}) does not exist, check`,
          surveyId,
          surveyQuestionId,
          surveyQuestionAnswerId,
        };
        throw new BadRequestException({
          message: [
            `validation.survey_question_answer.NOT_FOUND|${JSON.stringify(addInfo)}`,
          ],
        });
      }
    }
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
    surveyQuestionAnswerId = null,
  }: {
    personId: number;
    surveyId: number;
    personSurveyId: number;
    surveyQuestionId: number;
    surveyQuestionAnswerId?: number | null;
  }) {
    if (!surveyQuestionAnswerId) {
      const pattern = `${this.cacheKey}${personId}:${surveyId}:${personSurveyId}:${surveyQuestionId}:*`;
      await this.redisService.removeAllKeysWithPattern(pattern);
      return;
    }
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

    const query = await super.getByQueryBase<PersonSurveyAnswersModel>({
      queryDto,
      alias: 'psa',
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

  async questionWasAnswered(
    personId: number,
    surveyId: number,
    personSurveyId: number,
    surveyQuestionId: number,
    useCache = true,
  ): Promise<boolean> {
    const survQPAQry = await this.getQuestionAnswer(
      personId,
      surveyId,
      personSurveyId,
      surveyQuestionId,
      true,
      useCache,
    );
    return survQPAQry ? true : false;
  }

  async getQuestionAnswer(
    personId: number,
    surveyId: number,
    personSurveyId: number,
    surveyQuestionId: number,
    forEnsureExist = false,
    useCache = true,
  ): Promise<AnswerModel | null> {
    let cacheKey = null;
    if (useCache) {
      cacheKey = `${this.cacheKey}${personId}:${surveyId}:${personSurveyId}:${surveyQuestionId}:wasAnswered`;
      const answer = await this.redisService.get<AnswerModel>(cacheKey);
      if (answer) {
        return answer;
      }
    }
    const query = this.getBasicQuery();
    if (forEnsureExist === false) {
      query
        .addSelect([
          'sq.question as "question"',
          'spa.answer as "answer"',
          'spa.educational_tip as "educationalTip"',
          'spa.value as "value"',
        ])
        .innerJoin(
          SurveyQuestions,
          'sq',
          `sq.survey_id = psa.survey_id and sq.id = psa.survey_question_id`,
        )
        .innerJoin(
          SurveyQuestionsPossibleAnswers,
          'spa',
          `spa.survey_id = psa.survey_id and spa.survey_question_id = psa.survey_question_id and
            spa.id = psa.survey_question_answer_id`,
        );
    }
    const survQPAQry = await query
      .where(
        `psa.person_id = :personId and psa.survey_id = :surveyId and psa.person_survey_id = :personSurveyId and
          psa.survey_question_id = :surveyQuestionId`,
        {
          personId,
          surveyId,
          personSurveyId,
          surveyQuestionId,
        },
      )
      .getRawOne();
    let response: AnswerModel | null = null;
    if (cacheKey && survQPAQry) {
      response = {
        question: survQPAQry.question,
        questionOrder: survQPAQry.questionOrder,
        answerId: Number(survQPAQry.surveyQuestionAnswerId),
        answer: survQPAQry.answer,
        educationalTip: survQPAQry.educationalTip,
        value: Number(survQPAQry.value),
      };
      await this.redisService.set<AnswerModel>(
        cacheKey,
        response,
        this.cacheTime,
      );
    }
    return response;
  }

  async getQuestionsAndAnswers(
    personId: number,
    surveyId: number,
    personSurveyId: number,
    gender: string,
    useCache = true,
  ): Promise<AnswerModel[]> {
    let cacheKey = null;
    if (useCache) {
      cacheKey = `${this.cacheKey}${personId}:${surveyId}:${personSurveyId}`;
      const answers = await this.redisService.get<AnswerModel[]>(cacheKey);
      if (answers) {
        return answers;
      }
    }
    const questionsAnswers = await this.getBasicQuery()
      .addSelect([
        'sq.question as "question"',
        'sq.order as "questionOrder"',
        'spa.answer as "answer"',
        'spa.educational_tip as "educationalTip"',
        'spa.value as "value"',
      ])
      .innerJoin(
        SurveyQuestions,
        'sq',
        `sq.survey_id = psa.survey_id and sq.id = psa.survey_question_id and sq.gender in (:gender, 'Ambos')`,
        { gender },
      )
      .innerJoin(
        SurveyQuestionsPossibleAnswers,
        'spa',
        `spa.survey_id = psa.survey_id and spa.survey_question_id = psa.survey_question_id and
          spa.id = psa.survey_question_answer_id`,
      )
      .where(
        `psa.person_id = :personId and psa.survey_id = :surveyId and psa.person_survey_id = :personSurveyId`,
        {
          personId,
          surveyId,
          personSurveyId,
        },
      )
      .orderBy('sq.order', 'ASC')
      .getRawMany();
    console.log(questionsAnswers);
    if (questionsAnswers.length > 0) {
      const response = questionsAnswers.map((questionAnswer) => {
        const answer: AnswerModel = {
          question: questionAnswer.question,
          questionOrder: Number(questionAnswer.questionOrder),
          answerId: Number(questionAnswer.surveyQuestionAnswerId),
          answer: questionAnswer.answer,
          educationalTip: questionAnswer.educationalTip,
          value: Number(questionAnswer.value),
        };
        return answer;
      });
      await this.redisService.set<AnswerModel[]>(
        cacheKey,
        response,
        this.cacheTime,
      );
      return response;
    }
    return [];
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
