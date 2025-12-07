import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PersonSurveyAnalysisModel,
  PersonSurveyCreateModel,
  PersonSurveyFullModel,
  PersonSurveyModel,
  PersonSurveyUpdateModel,
} from 'src/domain/model/personSurvey';
import { IPersonSurveyRepository } from 'src/domain/repositories/personSurveyRepository.interface';
import { EntityManager, Repository } from 'typeorm';
import { GetGenericAllDto } from '../common/dtos/genericRepo-dto.class';
import { PageDto } from '../common/dtos/page.dto';
import { PageMetaDto } from '../common/dtos/pageMeta.dto';
import { KeyValueObjectList } from '../common/interfaces/common';
import { extractErrorDetails } from '../common/utils/extract-error-details';
import { Patient } from '../entities/patient.entity';
import { Person } from '../entities/person.entity';
import { PersonSurvey } from '../entities/personSurvey.entity';
import { State } from '../entities/state.entity';
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

  async update(
    personId: number,
    surveyId: number,
    id: number,
    payload: PersonSurveyUpdateModel,
    em: EntityManager,
  ): Promise<boolean> {
    const repo = em ? em.getRepository(PersonSurvey) : this.personSurveyEntity;
    try {
      const dataSaved = await repo.update({ personId, surveyId, id }, payload);
      this.cleanCacheData({ personId, surveyId });
      return dataSaved.affected > 0;
    } catch (er: unknown) {
      await this.manageErrors(personId, surveyId, payload.stateId, er);
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
    const pattern = `${this.cacheKey}${personId}:${surveyId}:*`;
    await this.redisService.removeAllKeysWithPattern(pattern);
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
        'ps.state_id as "stateId"',
        'ps.age as "age"',
        'ps.phone as "phone"',
        'ps.email as "email"',
        'ps.weight as "weight"',
        'ps.size as "size"',
        'ps.imc_value as "imcValue"',
        'ps.imc_points as "imcPoints"',
        'ps.imc_category as "imcCategory"',
        'ps.estimated_risk as "estimatedRisk"',
        'ps.total_score as "totalScore"',
        'ps.created_at as "createdAt"',
        'ps.updated_at as "updatedAt"',
      ])
      .withDeleted();
  }

  async getByIdFullModel(
    personId: number,
    surveyId: number,
    id: number,
  ): Promise<PersonSurveyFullModel> {
    const surveyPerson = await this.getBasicQuery()
      .addSelect([
        'pe.ci as ci',
        'pe.full_name as "fullName"',
        'pe.date_of_birth as "dateOfBirth"',
        'pe.gender as "gender"',
      ])
      .innerJoin('person', 'pe', 'pe.id = ps.person_id')
      .where(
        `ps.person_id = :personId and ps.survey_id = :surveyId and ps.id = :id`,
        {
          personId,
          surveyId,
          id,
        },
      )
      .getRawOne();
    if (!surveyPerson) {
      return null;
    }
    const response = this.toModelPanel(surveyPerson);
    return response;
  }

  async getByQuery(
    queryDto: GetGenericAllDto,
  ): Promise<PageDto<PersonSurveyModel>> {
    const queryList = this.getBasicQuery()
      .addSelect([
        'pe.ci as "ci"',
        'pe.full_name as "fullName"',
        'pe.date_of_birth as "dateOfBirth"',
        'pe.gender as "gender"',
        'st.name as "stateName"',
        'pa.created_at as "diagnosedOn"',
      ])
      .withDeleted()
      .innerJoin(State, 'st', 'st.id = ps.state_id')
      .leftJoin(
        Patient,
        'pa',
        'pa.person_id = ps.person_id and pa.survey_id = ps.survey_id and pa.person_survey_id = ps.id',
      )
      .where('ps.estimated_risk is not null')
      .orderBy('pe.full_name', 'ASC');

    const queryCount = this.personSurveyEntity
      .createQueryBuilder('ps')
      .where('ps.estimated_risk is not null');
    const { filter } = queryDto;

    const fullName = filter
      ? this.atrIsIncludedAndGetValOp(filter, 'fullName', 'varchar')
      : null;

    if (fullName && fullName.condition) {
      const value = fullName.value;
      queryCount.innerJoin(
        Person,
        'pe',
        `pe.id = ps.person_id and pe.full_name ${fullName.condition}`,
        { value },
      );
      queryList.innerJoin(
        Person,
        'pe',
        `pe.id = ps.person_id and pe.full_name ${fullName.condition}`,
        { value },
      );
    } else {
      queryList.innerJoin(Person, 'pe', 'pe.id = ps.person_id');
    }

    const addAtrs: KeyValueObjectList<string> = {
      fullName: 'varchar',
    };
    const query = await super.getByQueryBase<PersonSurvey>({
      queryDto,
      alias: 'ps',
      queryList,
      queryCount,
      addAtrs,
    });

    const survQuestions = query.entities.map((survQuestion) =>
      this.toModelAnalysis(survQuestion),
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
    personId: number,
    surveyId: number,
    id: number,
  ): Promise<PersonSurveyModel> {
    const survey = await this.getById(personId, surveyId, id);
    if (!survey) {
      throw new NotFoundException({
        message: [
          `validation.person_survey.NOT_FOUND|{"personId":"${personId}","surveyId":"${id}","surveyId":"${id}"}`,
        ],
      });
    }
    return survey;
  }

  async getById(
    personId: number,
    surveyId: number,
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
    const personSAQry = await query
      .where(`person_id = :personId and survey_id = :surveyId and id = :id`, {
        personId,
        surveyId,
        id,
      })
      .getRawOne();
    if (!personSAQry) {
      return null;
    }
    personSurvAns = this.toModel(personSAQry);
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

  private toModelPanel(entity: PersonSurvey): PersonSurveyFullModel {
    const model = new PersonSurveyFullModel();

    model.personId = Number(entity.personId);
    model.surveyId = Number(entity.surveyId);
    model.id = Number(entity.id);
    model.stateId = Number(entity.stateId);
    model.ci = entity['ci'];
    model.fullName = entity['fullName'];
    model.dateOfBirth = entity['dateOfBirth'];
    model.gender = entity['gender'];
    model.age = Number(entity.age);
    model.totalScore = entity.totalScore ? Number(entity.totalScore) : null;
    model.weight = entity.weight ? Number(entity.weight) : null;
    model.size = entity.size ? Number(entity.size) : null;
    model.imcValue = entity.imcValue ? Number(entity.imcValue) : null;
    model.imcPoints = entity.imcPoints ? Number(entity.imcPoints) : null;
    model.imcCategory = entity.imcCategory ?? null;
    model.estimatedRisk = entity.estimatedRisk ?? null;
    model.phone = entity.phone;
    model.email = entity.email;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;

    return model;
  }

  private toModelAnalysis(entity: PersonSurvey): PersonSurveyAnalysisModel {
    const model = new PersonSurveyAnalysisModel();

    model.personId = Number(entity.personId);
    model.surveyId = Number(entity.surveyId);
    model.id = Number(entity.id);
    model.stateId = Number(entity.stateId);
    model.ci = entity['ci'];
    model.fullName = entity['fullName'];
    model.dateOfBirth = entity['dateOfBirth'];
    model.state = entity['stateName'];
    model.age = Number(entity.age);
    model.gender = entity['gender'];
    model.totalScore = entity.totalScore ? Number(entity.totalScore) : null;
    model.weight = entity.weight ? Number(entity.weight) : null;
    model.size = entity.size ? Number(entity.size) : null;
    model.imcValue = entity.imcValue ? Number(entity.imcValue) : null;
    model.imcPoints = entity.imcPoints ? Number(entity.imcPoints) : null;
    model.imcCategory = entity.imcCategory ?? null;
    model.estimatedRisk = entity.estimatedRisk ?? null;
    model.phone = entity.phone;
    model.email = entity.email;
    model.diagnosedOn = entity['diagnosedOn'];
    model.isDiagnosed = entity['diagnosedOn'] === null ? false : true;

    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;

    return model;
  }

  private toModel(entity: PersonSurvey): PersonSurveyModel {
    const model = new PersonSurveyModel();

    model.personId = Number(entity.personId);
    model.surveyId = Number(entity.surveyId);
    model.id = Number(entity.id);
    model.stateId = Number(entity.stateId);
    model.age = Number(entity.age);
    model.totalScore = entity.totalScore ? Number(entity.totalScore) : null;
    model.weight = entity.weight ? Number(entity.weight) : null;
    model.size = entity.size ? Number(entity.size) : null;
    model.imcValue = entity.imcValue ? Number(entity.imcValue) : null;
    model.imcPoints = entity.imcPoints ? Number(entity.imcPoints) : null;
    model.imcCategory = entity.imcCategory ?? null;
    model.estimatedRisk = entity.estimatedRisk ?? null;
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
