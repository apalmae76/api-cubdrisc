import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import {
  EOperatorsActionsES,
  OperatorsActionCreateModel,
  OperatorsActionModel,
  OperatorsActionPanelModel,
} from 'src/domain/model/operatorsActions';
import { IOperatorsActionsRepository } from 'src/domain/repositories/operatorsActions.interface';
import { GetGenericAllDto } from '../common/dtos/genericRepo-dto.class';
import { PageDto } from '../common/dtos/page.dto';
import { PageMetaDto } from '../common/dtos/pageMeta.dto';
import { KeyValueObjectList } from '../common/interfaces/common';
import { EOperatorsActions } from '../common/utils/constants';
import { OperatorsActions } from '../entities/operators-actions.entity';
import { Person } from '../entities/person.entity';
import { ApiLoggerService } from '../services/logger/logger.service';
import { BaseRepository } from './base.repository';

@Injectable()
export class DatabaseOperatorsActionsRepository
  extends BaseRepository
  implements IOperatorsActionsRepository {
  constructor(
    @InjectRepository(OperatorsActions)
    private readonly operActionsEntity: Repository<OperatorsActions>,
    protected readonly logger: ApiLoggerService,
  ) {
    super(operActionsEntity, logger);
  }

  async create(
    payload: OperatorsActionCreateModel,
    em: EntityManager = null,
  ): Promise<OperatorsActionModel> {
    const repo = em
      ? em.getRepository(OperatorsActions)
      : this.operActionsEntity;

    const operation = await repo.save(this.toEntityCreate(payload));

    return this.toModel(operation);
  }

  async createWithEntityManager(
    payload: OperatorsActionCreateModel,
    em: EntityManager,
  ) {
    const entity = this.toEntityCreate(payload);

    const operation = await em.save(entity);

    return this.toModel(operation);
  }

  async setActionDetails(
    id: number,
    details: object,
    em: EntityManager,
  ): Promise<void> {
    const repo = em
      ? em.getRepository(OperatorsActions)
      : this.operActionsEntity;

    await repo.update({ id }, { details });
  }

  private getBasicQuery() {
    const qry = this.operActionsEntity
      .createQueryBuilder('oa')
      .select([
        'oa.id as "id"',
        'oa.operator_id as "operatorId"',
        'oa.to_user_id as "toUserId"',
        'oa.action_id as "actionId"',
        'oa.reason as "reason"',
        'oa.details as "details"',
        'oa.created_at as "createdAt"',
      ]);
    return qry;
  }

  async getByQuery(
    queryDto: GetGenericAllDto,
  ): Promise<PageDto<OperatorsActionPanelModel>> {
    const listOfEnumsAtrs = {
      actionId: 'EOperatorsActions',
    };
    queryDto.filter = super.convertEnumFilterValues(
      queryDto.filter,
      listOfEnumsAtrs,
    );

    let queryCount = null;
    const queryList = this.getBasicQuery()
      .addSelect([`opuser.full_name as "operator.name"`])
      .withDeleted()
      .addSelect(['oa.to_user_id as "userId"', `user.full_name as "user.name"`])
      .withDeleted();

    const opUserName = super.atrIsIncludedAndGetValOp(
      queryDto.filter,
      'operator.name',
      'varchar',
      'opUserId',
    );
    if (opUserName.condition) {
      const opUserId = opUserName.value;
      queryCount = this.operActionsEntity.createQueryBuilder('oa');
      queryCount.innerJoin(
        Person,
        'opuser',
        `oa.operator_id = opuser.id and opuser.full_name ${opUserName.condition}`,
        { opUserId },
      );
      queryList.innerJoin(
        Person,
        'opuser',
        `oa.operator_id = opuser.id and opuser.full_name ${opUserName.condition}`,
        { opUserId },
      );
    } else {
      queryList.innerJoin(Person, 'opuser', 'oa.operator_id = opuser.id');
    }

    const userName = super.atrIsIncludedAndGetValOp(
      queryDto.filter,
      'user.name',
      'varchar',
      'toUser',
    );
    if (userName.condition) {
      const toUser = userName.value;
      if (!queryCount) {
        queryCount = this.operActionsEntity.createQueryBuilder('oa');
      }
      queryCount.innerJoin(
        Person,
        'user',
        `oa.to_user_id = user.id and user.full_name ${userName.condition}`,
        { toUser },
      );
      queryList.innerJoin(
        Person,
        'user',
        `oa.to_user_id = user.id and user.full_name ${userName.condition}`,
        { toUser },
      );
    } else {
      queryList.leftJoin(Person, 'user', 'oa.to_user_id = user.id');
    }

    const userId = super.atrIsIncludedAndGetValOp(
      queryDto.filter,
      'userId',
      'bigint',
      'toUserId',
    );
    if (userId.condition) {
      const toUserId = userId.value;
      if (!queryCount) {
        queryCount = this.operActionsEntity.createQueryBuilder('oa');
      }
      queryCount.andWhere(`oa.to_user_id ${userId.condition}`, { toUserId });
      queryList.andWhere(`oa.to_user_id ${userId.condition}`, { toUserId });
    }

    const addAtrs: KeyValueObjectList<string> = {
      'operator.name': 'varchar',
      userId: 'bigint',
      'user.name': 'varchar',
    };

    const data = await super.getByQueryBase<OperatorsActions>({
      queryDto,
      alias: 'oa',
      queryCount,
      queryList,
      addAtrs,
    });
    const opActions = data.entities.map((opAction) =>
      this.toModelPanel(opAction),
    );
    const pageMetaDto = new PageMetaDto({
      total: data.itemCount,
      pageOptionsDto: queryDto,
      itemPageCount: opActions.length,
    });
    return new PageDto(opActions, pageMetaDto);
  }

  private toModelPanel(entity: OperatorsActions): OperatorsActionPanelModel {
    const model = new OperatorsActionPanelModel();

    model.id = Number(entity.id);
    model.operator = {
      id: Number(entity['operatorId']),
      name: entity['operator.name'],
    };
    if (entity['userId']) {
      model.user = {
        id: Number(entity['userId']),
        name: entity['user.name'],
      };
    } else {
      model.user = null;
    }
    model.action = {
      id: EOperatorsActions[entity.actionId],
      name: EOperatorsActionsES[EOperatorsActions[entity.actionId]],
    };
    model.reason = entity.reason;
    model.details = entity.details;
    model.createdAt = entity.createdAt;

    return model;
  }

  /**
   *
   * @param id Operation ID
   * @returns OperatorsActionModel
   */
  async get(id: number): Promise<OperatorsActionModel> {
    const queryBuilder = this.getBasicQuery();
    const operation = await queryBuilder
      .where('oa.id = :id', { id })
      .getRawOne();

    if (!operation) {
      return null;
    }
    return this.toModel(operation);
  }

  async getLastLockingActionIdFromUser(toUserId: number): Promise<number> {
    const actionId = EOperatorsActions.USER_LOCK;
    const lastAction = await this.operActionsEntity
      .createQueryBuilder('oa')
      .select('oa.id as "id"')
      .where('oa.toUserId = :toUserId and oa.actionId = :actionId', {
        toUserId,
        actionId,
      })
      .orderBy('created_at', 'DESC')
      .limit(1)
      .getRawOne();

    if (!lastAction) {
      return null;
    }

    return lastAction.id;
  }

  async getOrFail(id: number): Promise<OperatorsActionModel> {
    const operation = await this.get(id);

    if (!operation) {
      throw new NotFoundException({
        message: [
          `validation.admin.OP_ACTION_NOT_FOUND|{"operatorActionId":"${id}"}`,
        ],
      });
    }
    return operation;
  }

  async getAll(): Promise<OperatorsActionModel[]> {
    const queryBuilder = this.getBasicQuery();
    const actions = await queryBuilder.getRawMany();

    if (!actions) {
      return null;
    }
    return actions.map((obj) => this.toModel(obj));
  }

  async getAllByOperator(opId: number): Promise<OperatorsActionModel[]> {
    const actions = await this.operActionsEntity
      .createQueryBuilder('op')
      .where('oa.operator_id = :opId', { opId })
      .getRawMany();

    return actions.map((obj) => this.toModel(obj));
  }

  async getAllByAffectedUser(userId: number): Promise<OperatorsActionModel[]> {
    const actions = await this.operActionsEntity
      .createQueryBuilder('op')
      .where('oa.to_user_id = :userId', { userId })
      .getRawMany();

    return actions.map((obj) => this.toModel(obj));
  }

  private toModel(entity: OperatorsActions): OperatorsActionModel {
    const model = new OperatorsActionModel();

    model.id = Number(entity.id);
    model.operatorId = entity.operatorId;
    model.toUserId = entity.toUserId;
    model.actionId = entity.actionId;
    model.reason = entity.reason;
    model.details = entity.details;
    model.createdAt = entity.createdAt;

    return model;
  }

  private toEntityCreate(model: OperatorsActionCreateModel): OperatorsActions {
    const entity = new OperatorsActions();

    entity.operatorId = model.operatorId;
    entity.toUserId = model.toUserId;
    entity.actionId = model.actionId;
    entity.reason = model.reason;
    entity.details = model.details;

    return entity;
  }
}
