import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StateModel } from 'src/domain/model/state';
import { IStateRepository } from 'src/domain/repositories/stateRepository.interface';
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

  async get(id: number, failIfNotExist = false): Promise<StateModel> {
    const states = await this.getAll();
    const state =
      states && states.length ? states.find((item) => item.id == id) : null;
    if (failIfNotExist && !state) {
      throw new BadRequestException({
        message: [`validation.state.NOT_FOUND|{"stateId":"${id}"}`],
      });
    }
    return state;
  }

  async ensureExistOrFail(stateId: number): Promise<void> {
    await this.get(stateId, true);
  }

  async getStateNameOrFail(id: number): Promise<string> {
    const state = await this.get(id, true);
    return state ? state.name : null;
  }

  async getStateCodeByIdOrFail(id: number): Promise<string> {
    const state = await this.get(id, true);
    if (!state.code) {
      this.logger.warn('Validating state', {
        stateId: id,
        context: 'DatabaseStateRepository.getStateCodeByIdOrFail',
      });
      throw new BadRequestException({
        message: [`validation.common.STATE_ISO2_NOT_FOUND|{"stateId":"${id}"}`],
      });
    }
    return state.code;
  }

  async getIdByCode(code: string): Promise<number> {
    if (!code || code.length === 0) {
      return null;
    }
    const states = await this.getAll();
    const state =
      states && states.length
        ? states.find(
          (item) =>
            item.code && item.code.toLowerCase() == code.toLowerCase(),
        )
        : null;
    if (!state) {
      this.logger.debug('State by code ({code}) not found: CHECK', {
        code,
        context: 'DatabaseStateRepository.getIdByCode',
      });
      return null;
    }
    return state.id;
  }

  async getIdByCodeOrName(name: string): Promise<number> {
    if (!name || name.length === 0) {
      return null;
    }
    const states = await this.getAll();
    const state =
      states && states.length
        ? states.find(
          (item) =>
            (item.name && item.name.toLowerCase() == name.toLowerCase()) ||
            (item.code && item.code.toLowerCase() == name.toLowerCase()),
        )
        : null;
    if (!state) {
      this.logger.debug('State by name ({name}) not found: CHECK', {
        name,
        context: 'DatabaseStateRepository.getIdByName',
      });
      return null;
    }
    return state.id;
  }

  private getBasicQuery() {
    return this.stateEntity
      .createQueryBuilder('state')
      .select([
        'state.id as "id"',
        'state.name as "name"',
        'state.code as "code"',
        'state.created_at as "createdAt"',
        'state.updated_at as "updatedAt"',
        'state.deleted_at as "deletedAt"',
      ]);
  }

  async getAll(refreshMode = false): Promise<StateModel[]> {
    const cacheKey = `${this.cacheKey}Model`;
    if (!refreshMode) {
      const existInCache = await this.redisService.exist(cacheKey);
      if (existInCache) {
        return await this.redisService.get<StateModel[]>(cacheKey);
      }
    }
    const states = await this.getBasicQuery()
      .orderBy('state.code', 'ASC')
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
    model.name = entity.name;
    model.code = entity.code;
    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;

    return model;
  }
}
