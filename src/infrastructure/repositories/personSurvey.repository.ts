import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PersonSurveyCreateModel,
  PersonSurveyModel,
} from 'src/domain/model/personSurvey';
import { IPersonSurveyRepository } from 'src/domain/repositories/personSurveyRepository.interface';
import { EntityManager, Repository } from 'typeorm';
import { GetGenericAllDto } from '../common/dtos/genericRepo-dto.class';
import { PageDto } from '../common/dtos/page.dto';
import { PageMetaDto } from '../common/dtos/pageMeta.dto';
import { extractErrorDetails } from '../common/utils/extract-error-details';
import { PersonSurvey } from '../entities/personSurvey.entity';
import { ApiLoggerService } from '../services/logger/logger.service';
import { ApiRedisService } from '../services/redis/redis.service';
import { BaseRepository } from './base.repository';
@Injectable()
export class DatabasePersonSurveyRepository
  extends BaseRepository
  implements IPersonSurveyRepository {
  private readonly cacheKey = 'Repository:PersonSurvey:';
  private readonly cacheTime = 15 * 60; // 15 mins
  constructor(
    @InjectRepository(PersonSurvey)
    private readonly personSurveyEntity: Repository<PersonSurvey>,
    private readonly redisService: ApiRedisService,
    protected readonly logger: ApiLoggerService,
  ) {
    super(personSurveyEntity, logger);
  }

  async create(
    data: PersonSurveyCreateModel,
    em: EntityManager,
  ): Promise<PersonSurveyModel> {
    const repo = em ? em.getRepository(PersonSurvey) : this.personSurveyEntity;
    try {
      const entity = this.toCreate(data);
      const dataSaved = await repo.save(entity);
      this.cleanCacheData(data);
      return this.toModel(dataSaved);
    } catch (er: unknown) {
      await this.manageErrors(data.personId, data.surveyId, data.stateId, er);
      throw er;
    }
  }

  private toCreate(model: PersonSurveyCreateModel): PersonSurvey {
    const entity = new PersonSurvey();

    entity.personId = model.personId;
    entity.surveyId = model.surveyId;

    entity.stateId = model.stateId;
    entity.age = model.age;
    entity.phone = model.phone ?? null;
    entity.email = model.email ?? null;

    return entity;
  }

  private async cleanCacheData({
    personId,
    surveyId,
  }: {
    personId: number;
    surveyId: number;
  }) {
    const cacheKey = `${this.cacheKey}${personId}:${surveyId}`;
    await this.redisService.del(cacheKey);
  }

  async setEmail(
    personId: number,
    surveyId: number,
    id: number,
    email: string | null,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em ? em.getRepository(PersonSurvey) : this.personSurveyEntity;
    const result = await repo.update({ personId, surveyId, id }, { email });
    await this.cleanCacheData({ personId, surveyId });
    return !!result;
  }

  async setPhone(
    personId: number,
    surveyId: number,
    id: number,
    phone: string | null,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em ? em.getRepository(PersonSurvey) : this.personSurveyEntity;
    const result = await repo.update(
      { personId, surveyId, id },
      { phone: phone },
    );
    await this.cleanCacheData({ personId, surveyId });
    return !!result;
  }

  private getBasicQuery() {
    return this.personSurveyEntity
      .createQueryBuilder('ps')
      .select([
        'ps.person_id as "personId"',
        'ps.survey_id as "surveyId"',
        'ps.id as "id"',
        'ps.age as "age"',
        'ps.total_score as "totalScore"',
        'ps.waist_perimeter as "waistPerimeter"',
        'ps.weight as "weight"',
        'ps.size as "size"',
        'ps.imcc as "imcc"',
        'ps.estimated_risk as "estimatedRisk"',
        'ps.phone as "phone"',
        'ps.email as "email"',
        'ps.created_at as "createdAt"',
        'ps.updated_at as "updatedAt"',
      ])
      .withDeleted();
  }

  async getByIdForPanel(
    surveyId: number,
    personId: number,
    id: number,
  ): Promise<PersonSurveyModel> {
    const query = this.getBasicQuery();
    query.where(`personId = :personId and surveyId = :surveyId and id = :id`, {
      personId,
      surveyId,
      id,
    });
    const survey = await query.getRawOne();
    if (!survey) {
      return null;
    }
    return this.toModelPanel(survey);
  }

  async getByQuery(
    queryDto: GetGenericAllDto,
  ): Promise<PageDto<PersonSurveyModel>> {
    const queryList = this.getBasicQuery();

    const query = await super.getByQueryBase<PersonSurvey>(
      queryDto,
      'ps',
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

  async ensureExistOrFail(personId: number, surveyId: number, id: number) {
    await this.getByIdOrFail(personId, surveyId, id);
  }

  async getByIdOrFail(
    surveyId: number,
    personId: number,
    id: number,
  ): Promise<PersonSurveyModel> {
    const survey = await this.getById(surveyId, personId, id);
    if (!survey) {
      throw new NotFoundException({
        message: [
          `validation.person_survey_answer.NOT_FOUND|{"personId":"${personId}","surveyId":"${id}","surveyId":"${id}"}`,
        ],
      });
    }
    return survey;
  }

  async getById(
    surveyId: number,
    personId: number,
    id: number,
    useCache = true,
  ): Promise<PersonSurveyModel> {
    let cacheKey = null;
    let personSurvAns: PersonSurveyModel = null;
    if (useCache) {
      cacheKey = `${this.cacheKey}${personId}:${surveyId}:${id}`;
      personSurvAns = await this.redisService.get<PersonSurveyModel>(cacheKey);
      if (personSurvAns) {
        return personSurvAns;
      }
    }
    const query = await this.getBasicQuery();
    const survQPAQry = await query
      .where(`personId = :personId and surveyId = :surveyId and id = :id`, {
        personId,
        surveyId,
        id,
      })
      .getRawOne();
    if (!survQPAQry) {
      return null;
    }
    personSurvAns = this.toModel(survQPAQry);
    if (cacheKey) {
      await this.redisService.set<PersonSurveyModel>(
        cacheKey,
        personSurvAns,
        this.cacheTime,
      );
    }
    return personSurvAns;
  }

  async getLastByPersonId(
    personId: number,
    surveyId: number,
  ): Promise<PersonSurveyModel | null> {
    const query = await this.getBasicQuery();
    const personSurvy = await query
      .where(`person_id = :personId and survey_id = :surveyId`, {
        personId,
        surveyId,
      })
      .orderBy('updated_at', 'DESC')
      .limit(1)
      .getRawOne();
    return personSurvy ? this.toModel(personSurvy) : null;
  }

  private toModelPanel(entity: PersonSurvey): PersonSurveyModel {
    const model = new PersonSurveyModel();

    model.personId = Number(entity.personId);
    model.surveyId = Number(entity.surveyId);
    model.id = Number(entity.id);
    model.age = Number(entity.age);
    model.totalScore = Number(entity.totalScore);
    model.waistPerimeter = Number(entity.waistPerimeter);
    model.weight = Number(entity.weight);
    model.size = Number(entity.size);
    model.imcc = Number(entity.imcc);
    model.estimatedRisk = Number(entity.estimatedRisk);
    model.phone = entity.phone;
    model.email = entity.email;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;

    return model;
  }

  private toModel(entity: PersonSurvey): PersonSurveyModel {
    const model = new PersonSurveyModel();

    model.personId = Number(entity.personId);
    model.surveyId = Number(entity.surveyId);
    model.id = Number(entity.id);
    model.age = Number(model.age);
    model.totalScore = Number(model.totalScore);
    model.waistPerimeter = Number(model.waistPerimeter);
    model.weight = Number(model.weight);
    model.size = Number(model.size);
    model.imcc = Number(model.imcc);
    model.estimatedRisk = Number(model.estimatedRisk);
    model.phone = entity.phone;
    model.email = entity.email;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;

    return model;
  }

  private async manageErrors(
    personId: number,
    surveyId: number,
    stateId: number,
    er: unknown,
  ) {
    const { message } = extractErrorDetails(er);

    if (message) {
      if (message.includes('FK_31a038e9596dbcd324c6d495ed0')) {
        const addInfo = {
          technicalError: `Submitted survey Id (${surveyId}) does not exist, check`,
          surveyId,
        };
        throw new BadRequestException({
          message: [`validation.survey.NOT_FOUND|${JSON.stringify(addInfo)}`],
        });
      } else if (message.includes('FK_ad1be1c0fbf5b79782079c7e5d1')) {
        const addInfo = {
          technicalError: `Submitted person Id (${personId}) does not exist, check`,
          personId,
        };
        throw new BadRequestException({
          message: [`validation.person.NOT_FOUND|${JSON.stringify(addInfo)}`],
        });
      } else if (message.includes('FK_fb7105aba43c8d88ed05e597156')) {
        const addInfo = {
          technicalError: `Submitted state Id (${stateId}) does not exist, check`,
          stateId,
        };
        throw new BadRequestException({
          message: [`validation.state.NOT_FOUND|${JSON.stringify(addInfo)}`],
        });
      }
    }
  }
}
