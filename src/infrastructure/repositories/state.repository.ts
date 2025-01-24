import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StateModel } from 'src/domain/model/state';
import {
  IStateRepository,
  StatesQueryParams,
} from 'src/domain/repositories/stateRepository.interface';
import { Repository } from 'typeorm';
import { State } from '../entities/state.entity';
import { ApiLoggerService } from '../services/logger/logger.service';
import { ApiRedisService } from '../services/redis/redis.service';

@Injectable()
export class DatabaseStateRepository implements IStateRepository {
  private readonly cacheKey = 'Repository:State:';
  private readonly cacheTime = 60 * 60; // 1 hour
  constructor(
    @InjectRepository(State)
    private readonly stateEntity: Repository<State>,
    private readonly redisService: ApiRedisService,
    private readonly logger: ApiLoggerService,
  ) { }

  async stateExistOrGetError(
    countryId: number,
    stateId: number,
  ): Promise<string> {
    const state = await this.get(countryId, stateId);
    if (!state) {
      this.logger.debug('Validating state exist fail', {
        countryId,
        stateId,
        context: 'DatabaseStateRepository.stateExistOrGetError',
      });
      return `validation.common.STATE_ID_NOT_EXIST|{"stateId":"${stateId}"}`;
    }
    return null;
  }

  async ensureExistOrFail(countryId: number, stateId: number): Promise<void> {
    const stateError = await this.stateExistOrGetError(countryId, stateId);
    if (stateError) {
      throw new NotFoundException({
        message: [stateError],
      });
    }
  }

  async getState(stateId: number): Promise<StateModel | null> {
    const state = await this.stateEntity.findOne({
      where: { id: stateId },
      relations: ['states'],
    });
    if (!state) {
      return null;
    }
    return this.toModel(state);
  }

  async getStateNameOrFail(
    countryId: number,
    stateId: number,
  ): Promise<string> {
    const state = await this.get(countryId, stateId, true);
    return state ? state.name : null;
  }

  async get(
    countryId: number,
    stateId: number,
    failIfNotExist = false,
  ): Promise<StateModel> {
    const states = await this.getAll(countryId);
    const state =
      states && states.length
        ? states.find((item) => item.id == stateId)
        : null;
    if (failIfNotExist && !state) {
      throw new BadRequestException({
        message: [
          `validation.common.STATE_ID_NOT_EXIST|{"stateId":"${stateId}"}`,
        ],
      });
    }
    return state;
  }

  async getByQuery(query: StatesQueryParams): Promise<StateModel[]> {
    let states = await this.getAll(parseInt(query.countryId));
    if (states && states.length) {
      const description = query.description
        ? query.description.trim().toLowerCase()
        : null;
      if (description) {
        states = states.filter(
          (item) =>
            item.name.toLowerCase().slice(0, description.length) ===
            description,
        );
      }
      if (query.orderDir === 'DESC') {
        states = states.sort((a, b) => {
          if (a.name < b.name) {
            return 1;
          }
          if (a.name > b.name) {
            return -1;
          }
          return 0;
        });
      }
      if (query.limit) {
        states = states.slice(0, parseInt(query.limit));
      }
      return states;
    }
    return [];
  }

  async getStateIso2ByIdOrFail(
    countryId: number,
    stateId: number,
  ): Promise<string> {
    const states = await this.getAll(countryId);
    const state =
      states && states.length
        ? states.find((item) => item.id == stateId)
        : null;
    if (!state) {
      this.logger.debug('Validating state', {
        countryId,
        stateId,
        context: 'DatabaseStateRepository.getStateIso2ByIdOrFail',
      });
      throw new BadRequestException({
        message: [
          `validation.common.STATE_ID_NOT_EXIST|{"countryId":"${countryId}","stateId":"${stateId}"}`,
        ],
      });
    }
    if (!state.stateCode) {
      this.logger.warn('Validating state', {
        countryId,
        stateId,
        context: 'DatabaseStateRepository.getStateIso2ByIdOrFail',
      });
      throw new BadRequestException({
        message: [
          `validation.common.STATE_ISO2_NOT_FOUND|{"countryId":"${countryId}","stateId":"${stateId}"}`,
        ],
      });
    }
    return state.stateCode;
  }

  async getIdByIso2(countryId: number, stateIso2: string): Promise<number> {
    if (!stateIso2 || stateIso2.length === 0) {
      return null;
    }
    const states = await this.getAll(countryId);
    const state =
      states && states.length
        ? states.find(
          (item) =>
            item.stateCode &&
            item.stateCode.toLowerCase() == stateIso2.toLowerCase(),
        )
        : null;
    if (!state) {
      this.logger.debug('State by Iso2 ({stateIso2}) not found: CHECK', {
        countryId,
        stateIso2,
        context: 'DatabaseStateRepository.getIdByStateIso2',
      });
      return null;
    }
    return state.id;
  }

  async getIdByIso2orName(countryId: number, name: string): Promise<number> {
    if (!countryId || !name || name.length === 0) {
      return null;
    }
    const states = await this.getAll(countryId);
    const state =
      states && states.length
        ? states.find(
          (item) =>
            (item.name && item.name.toLowerCase() == name.toLowerCase()) ||
            (item.stateCode &&
              item.stateCode.toLowerCase() == name.toLowerCase()),
        )
        : null;
    if (!state) {
      this.logger.debug('State by name ({name}) not found: CHECK', {
        countryId,
        name,
        context: 'DatabaseStateRepository.getIdByName',
      });
      return null;
    }
    return state.id;
  }

  async getAll(countryId: number, refreshMode = false): Promise<StateModel[]> {
    const cacheKey = `${this.cacheKey}${countryId}_Model`;
    if (!refreshMode) {
      const existInCache = await this.redisService.exist(cacheKey);
      if (existInCache) {
        return await this.redisService.get<StateModel[]>(cacheKey);
      }
    }
    const states = await this.stateEntity
      .createQueryBuilder('state')
      .select([
        'state.id as "id"',
        'state.name as "name"',
        'state.state_code as "stateCode"',
      ])
      .where('state.country_id = :countryId', { countryId })
      .orderBy('state.name', 'ASC')
      .getRawMany();
    if (states && states.length > 0) {
      const data: StateModel[] = states.map((obj) => this.toModel(obj));
      await this.redisService.set<StateModel[]>(cacheKey, data, this.cacheTime);
      return data;
    }
    return null;
  }

  private toModel(entity: State): StateModel {
    const model = new StateModel();

    model.id = Number(entity.id);
    model.countryId = Number(entity.countryId);
    model.name = entity.name;
    model.stateCode = entity.stateCode;
    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;

    return model;
  }

  private toEntity(state: StateModel): State {
    const entity = new State();

    entity.id = state.id;
    entity.name = state.name;
    entity.stateCode = state.stateCode;
    entity.createdAt = state.createdAt;
    entity.updatedAt = state.updatedAt;

    return entity;
  }
}
