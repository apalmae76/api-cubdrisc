/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException } from '@nestjs/common';
import { isValid, parseISO } from 'date-fns';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  EQueryOperators,
  GetGenericAllDto,
  booleanOperatorsList,
  numberDateOperatorsList,
  operatorsList,
  stringOperatorsList,
} from '../common/dtos/genericRepo-dto.class';
import { KeyValueObjectList } from '../common/interfaces/common';
import {
  EAppTypes,
  EOperatorsActions,
  RE_FLOAT_NUMBER,
  RE_INT_NUMBER_INCLUDE_0,
} from '../common/utils/constants';
import { extractErrorDetails } from '../common/utils/extract-error-details';
import { EAppRoles } from '../controllers/auth/role.enum';
import { User } from '../entities/user.entity';
import { ApiLoggerService } from '../services/logger/logger.service';

interface IBaseRepositoryQueryAllResponse<T> {
  entities: T[];
  itemCount: number;
}

export interface IQueryFilter {
  atr: string;
  op: EQueryOperators;
  value: string | string[];
}

export interface IQuerySort {
  selector: string;
  desc: boolean;
}

interface IGetUserNameQuery {
  queryCount: SelectQueryBuilder<unknown>;
  queryList: SelectQueryBuilder<unknown>;
  addAtrs: KeyValueObjectList<string>;
}
export class BaseRepository {
  constructor(
    protected repo: Repository<unknown>,
    protected readonly logger: ApiLoggerService,
  ) {}

  protected atrIsIncludedAndGetValOp(
    filters: string,
    atributo: string,
    atrType: string,
    filterRef: string = 'value',
  ): { condition: string; value: string; value1: string } {
    const filterExist = filters && filters.length;
    let aFilters = [];
    if (filterExist) {
      try {
        aFilters = JSON.parse(filters);
      } catch (er) {
        const { message } = extractErrorDetails(er);
        this.logger.warn(`Gen query, bad atr filter error: {message}`, {
          message,
        });
        throw new BadRequestException({
          message: [`validation.common.GEN_QUERY_BAD_FILTER`],
        });
      }
      const obj = aFilters.find((filter) => filter.atr === atributo);
      if (obj) {
        const convertToDate =
          (atrType === 'timestamp' || atrType === 'date') &&
          !!obj.value &&
          (obj.value.length === 10 ||
            (obj.value.length === 2 &&
              obj.value[0].length === 10 &&
              obj.value[1].length === 10));
        let condition = convertToDate
          ? `${obj.op} DATE(:${filterRef})`
          : `${obj.op} :${filterRef}`;
        let value = null;
        let value1 = null;
        switch (obj.op) {
          case EQueryOperators.CONTAINS:
            value = `%${obj.value}%`;
            condition = `ilike :${filterRef}`;
            break;
          case EQueryOperators.NOT_CONTAINS:
            value = `%${obj.value}%`;
            condition = `not ilike :${filterRef}`;
            break;
          case EQueryOperators.STARTS_WITH:
            value = `${obj.value}%`;
            condition = `ilike :${filterRef}`;
            break;
          case EQueryOperators.ENDS_WITH:
            value = `%${obj.value}`;
            condition = `ilike :${filterRef}`;
            break;
          case EQueryOperators.BETWEEN:
            value = obj.value[0];
            value1 = obj.value[1];
            condition = convertToDate
              ? `betteen DATE(:${filterRef}) and DATE(:${filterRef}1)`
              : `betteen :${filterRef} and :${filterRef}1`;
            break;
          case EQueryOperators.IN:
            value = obj.value;
            condition = `in (:...${filterRef})`;
            break;
          default:
            value = obj.value;
            break;
        }
        return { condition, value, value1 };
      }
    }
    return { condition: null, value: null, value1: null };
  }

  protected atrIsIncludedInOrder(sort: string, atributo: string): boolean {
    const sortExist = sort && sort.length;
    let aSorts = [];
    if (sortExist) {
      try {
        aSorts = JSON.parse(sort);
      } catch (er) {
        const { message } = extractErrorDetails(er);
        this.logger.warn(`Gen query, bad atr order error: {message}`, {
          message,
        });
        throw new BadRequestException({
          message: [`validation.common.GEN_QUERY_BAD_SORT`],
        });
      }
      const obj = aSorts.find((filter) => filter.selector === atributo);
      if (obj) {
        return obj.desc;
      }
      return null;
    }
    return null;
  }

  protected convertEnumFilterValues(
    filters: string,
    atributos: KeyValueObjectList<string>,
  ): string {
    function getEnumByName(enumName: string): any {
      switch (enumName) {
        case 'EOperatorsActions':
          return EOperatorsActions as any;
        case 'EAppRoles':
          return EAppRoles as any;
        case 'EAppTypes':
          return EAppTypes as any;
        default:
          return null;
      }
    }

    const filterExist = filters && filters.length > 0;
    let oldFilters = [];
    if (filterExist) {
      try {
        oldFilters = JSON.parse(filters);
      } catch (er) {
        const { message } = extractErrorDetails(er);
        this.logger.warn(
          `Gen query, bad atr filter (convert enum) error: {message}`,
          { message },
        );
        throw new BadRequestException({
          message: [`validation.common.GEN_QUERY_BAD_FILTER`],
        });
      }
      const newFilters = oldFilters.map((filter) => {
        if (atributos[filter.atr]) {
          const myEnum = getEnumByName(atributos[filter.atr]);
          if (myEnum) {
            let values: string[] = [];
            const transfValue: string[] = [];
            if (filter.op === EQueryOperators.IN) {
              if (
                typeof filter.value !== 'object' ||
                !filter.value ||
                filter.value.length < 1
              ) {
                throw new BadRequestException({
                  message: [
                    `validation.common.GEN_QUERY_BAD_VAL|{"op":"${filter.op}","type":"array","atr":"${filter.atr}"}`,
                  ],
                });
              }
              values = filter.value;
            } else {
              values = [filter.value];
            }
            values.map((value, index) => {
              const newValue = myEnum[value];
              if (newValue !== undefined) {
                transfValue[index] = newValue;
              } else {
                throw new BadRequestException({
                  message: [
                    `validation.common.GEN_QUERY_BAD_VAL_ENUM|{"atr":"${
                      filter.atr
                    }: ${atributos[filter.atr]}","value":"${filter.value}"}`,
                  ],
                });
              }
            });

            if (filter.op === 'in') {
              filter.value = transfValue;
            } else {
              filter.value = transfValue[0];
            }
          }
        }
        return filter;
      });
      this.logger.debug('Generic query: Transforming ENUM value to his key', {
        oldFilters: JSON.parse(filters),
        newFilters,
      });
      return JSON.stringify(newFilters);
    }
    return null;
  }

  protected getUserNameQuery(
    alias: string,
    queryCount: SelectQueryBuilder<unknown> = null,
    queryList: SelectQueryBuilder<unknown> = null,
    filter: string,
  ): IGetUserNameQuery {
    queryList.addSelect([`user.full_name as "user.name"`]).withDeleted();
    const userName = this.atrIsIncludedAndGetValOp(
      filter,
      'user.name',
      'varchar',
    );

    if (userName.condition) {
      const value = userName.value;
      if (!queryCount) {
        queryCount = this.repo.createQueryBuilder(alias);
      }
      queryCount.innerJoin(
        User,
        'user',
        `${alias}.user_id = user.id and user.full_name ${userName.condition}`,
        { value },
      );
      queryList.innerJoin(
        User,
        'user',
        `${alias}.user_id = user.id and user.full_name ${userName.condition}`,
        { value },
      );
    } else {
      queryList.innerJoin(User, 'user', `${alias}.user_id = user.id`);
    }

    const addAtrs: KeyValueObjectList<string> = {
      'user.name': 'varchar',
    };

    return { queryCount, queryList, addAtrs };
  }

  protected async getByQueryBase<T>(
    queryDto: GetGenericAllDto,
    alias: string,
    queryCount: SelectQueryBuilder<unknown> = null,
    queryList: SelectQueryBuilder<unknown> = null,
    hasUserName = false,
    addAtrs: KeyValueObjectList<string> = null,
  ): Promise<IBaseRepositoryQueryAllResponse<T>> {
    let isPersonalized = false;
    if (queryCount) {
      isPersonalized = true;
    } else {
      queryCount = this.repo.createQueryBuilder(alias);
    }
    if (queryList) {
      isPersonalized = true;
    } else {
      queryList = this.repo.createQueryBuilder(alias);
    }
    if (hasUserName) {
      const userName = this.getUserNameQuery(
        alias,
        queryCount,
        queryList,
        queryDto.filter,
      );
      queryCount = userName.queryCount;
      queryList = userName.queryList;
      if (addAtrs) {
        Object.assign(addAtrs, userName.addAtrs);
      } else {
        addAtrs = userName.addAtrs;
      }
    }
    const sortExists = queryDto.sort && queryDto.sort.length;
    let attributesTypes: KeyValueObjectList<string> = {};
    let sort = [];
    if (sortExists) {
      try {
        sort = JSON.parse(queryDto.sort);
      } catch (er) {
        const { message } = extractErrorDetails(er);
        this.logger.warn(`Gen query, bad atr sort error: {message}`, {
          message,
        });
        throw new BadRequestException({
          message: [`validation.common.GEN_QUERY_BAD_SORT`],
        });
      }
      attributesTypes = this.validateOrderBy(sort, addAtrs);
    }
    const filterExist = queryDto.filter && queryDto.filter.length;
    let filter = [];
    if (filterExist) {
      try {
        filter = JSON.parse(queryDto.filter);
      } catch (er) {
        const { message } = extractErrorDetails(er);
        this.logger.warn(`Gen query, bad atr filter error: {message}`, {
          message,
        });
        throw new BadRequestException({
          message: [`validation.common.GEN_QUERY_BAD_FILTER`],
        });
      }
      attributesTypes = this.validateAttributes(
        filter,
        attributesTypes,
        addAtrs,
      );

      filter.forEach((obj, index) => {
        const isPersonalizedAtr = addAtrs && addAtrs[obj.atr] !== undefined;
        if (!isPersonalizedAtr) {
          const { condition, val } = this.getCondition(
            attributesTypes[obj.atr],
            alias,
            obj,
            isPersonalizedAtr,
            index,
          );
          queryCount.andWhere(condition, val);
          queryList.andWhere(condition, val);
        }
      });
    }

    const itemCount = await queryCount.withDeleted().getCount();

    if (itemCount === 0) {
      return {
        entities: [],
        itemCount,
      };
    }
    if (sortExists) {
      let orderMoreThanOne = false;
      sort.forEach((obj) => {
        const order = obj.desc === 'true' || obj.desc ? 'DESC' : 'ASC';
        const selector = isPersonalized
          ? `"${obj.selector}"`
          : `${alias}.${obj.selector}`;
        if (orderMoreThanOne) {
          queryList.addOrderBy(selector, order);
        } else {
          queryList.orderBy(selector, order);
          orderMoreThanOne = true;
        }
      });
    } else {
      const hasOrderBy = Object.keys(queryList.expressionMap.orderBys).length;
      if (!hasOrderBy) {
        const isUpdatedAtInEntity =
          this.repo.metadata.findColumnWithPropertyName('updatedAt');
        if (isUpdatedAtInEntity) {
          queryList.orderBy(`${alias}.updatedAt`, 'DESC');
        } else {
          const isCreatedAtInEntity =
            this.repo.metadata.findColumnWithPropertyName('createdAt');
          if (isCreatedAtInEntity) {
            queryList.orderBy(`${alias}.createdAt`, 'DESC');
          }
        }
      }
    }

    queryList.offset(queryDto.skip).limit(queryDto.take).withDeleted();

    if (isPersonalized) {
      const raw = await queryList.getRawMany();
      return {
        entities: <T[]>raw,
        itemCount,
      };
    } else {
      const { entities } = await queryList.getRawAndEntities();
      return {
        entities: <T[]>entities,
        itemCount,
      };
    }
  }

  protected getCondition(
    atrType: string,
    alias: string,
    obj: any,
    isPersonalizedAtr: boolean,
    index: number,
  ): { condition: string; val: KeyValueObjectList<string>[] } {
    alias = isPersonalizedAtr ? '' : `${alias}.`;
    const convertToDate =
      (atrType === 'timestamp' || atrType === 'date') &&
      !!obj.value &&
      (obj.value.length === 10 ||
        (obj.value.length === 2 &&
          obj.value[0].length === 10 &&
          obj.value[1].length === 10));
    let condition = convertToDate
      ? `DATE(${alias}${obj.atr}) ${obj.op} DATE(:${obj.atr}${index})`
      : `${alias}${obj.atr} ${obj.op} :${obj.atr}${index}`;
    const val: KeyValueObjectList<string>[] = [];
    switch (obj.op) {
      case EQueryOperators.CONTAINS:
        val[`${obj.atr}${index}`] = `%${obj.value}%`;
        condition = `${alias}${obj.atr} ilike :${obj.atr}${index}`;
        break;
      case EQueryOperators.NOT_CONTAINS:
        val[`${obj.atr}${index}`] = `%${obj.value}%`;
        condition = `${alias}${obj.atr} not ilike :${obj.atr}${index}`;
        break;
      case EQueryOperators.STARTS_WITH:
        val[`${obj.atr}${index}`] = `${obj.value}%`;
        condition = `${alias}${obj.atr} ilike :${obj.atr}${index}`;
        break;
      case EQueryOperators.ENDS_WITH:
        val[`${obj.atr}${index}`] = `%${obj.value}`;
        condition = `${alias}${obj.atr} ilike :${obj.atr}${index}`;
        break;
      case EQueryOperators.BETWEEN:
        val[`${obj.atr}${index}1`] = obj.value[0];
        val[`${obj.atr}${index}2`] = obj.value[1];
        condition = convertToDate
          ? `DATE(${alias}${obj.atr}) ${obj.op} DATE(:${obj.atr}${index}1) and DATE(:${obj.atr}${index}2)`
          : `${alias}${obj.atr} ${obj.op} :${obj.atr}${index}1 and :${obj.atr}${index}2`;
        break;
      case EQueryOperators.IN:
        val[`${obj.atr}${index}`] = obj.value;
        condition = `${alias}${obj.atr} in (:...${obj.atr}${index})`;
        break;
      default:
        val[`${obj.atr}${index}`] = obj.value;
        break;
    }
    return { condition, val };
  }

  private validateAttributes(
    attributes: IQueryFilter[],
    entityAtrsAndTypes: KeyValueObjectList<string> = {},
    addAtrs: KeyValueObjectList<string>,
  ): KeyValueObjectList<string> {
    const isEntityAtrsAndTypesEmpty =
      Object.keys(entityAtrsAndTypes).length === 0;
    if (isEntityAtrsAndTypesEmpty) {
      this.repo.metadata.columns.map((column) => {
        entityAtrsAndTypes[column.propertyName] = `${column.type}`;
      });
      if (addAtrs) {
        Object.assign(entityAtrsAndTypes, addAtrs);
      }
    }

    const invalidAtrs = [];
    const invalidOps = [];
    const invalidBooleanVal = [];
    const invalidBooleanOp = [];
    const invalidNumberVal = [];
    const invalidNumberOp = [];
    const invalidStringVal = [];
    const invalidStringOp = [];
    const invalidDateOp = [];
    const invalidDateVal = [];
    attributes.forEach((obj) => {
      const isAtrOk = entityAtrsAndTypes[obj.atr] !== undefined;
      if (!isAtrOk) {
        invalidAtrs.push(obj.atr);
      }
      const opIsOk = operatorsList.includes(obj.op);
      if (opIsOk) {
        if (
          obj.op === EQueryOperators.BETWEEN &&
          (typeof obj.value !== 'object' ||
            !obj.value ||
            obj.value.length !== 2)
        ) {
          throw new BadRequestException({
            message: [
              `validation.common.GEN_QUERY_BAD_VAL|{"op":"${obj.op}","type":"array of two","atr":"${obj.atr}"}`,
            ],
          });
        } else if (
          obj.op === EQueryOperators.IN &&
          (typeof obj.value !== 'object' || !obj.value || obj.value.length < 1)
        ) {
          throw new BadRequestException({
            message: [
              `validation.common.GEN_QUERY_BAD_VAL|{"op":"${obj.op}","type":"array of n","atr":"${obj.atr}"}`,
            ],
          });
        }
        if (invalidOps.length === 0) {
          const strForOpTypeError = `"atr":"${obj.atr}","op":"${obj.op}"`;
          // boolean op ------------------
          if (entityAtrsAndTypes[obj.atr] === 'boolean') {
            const opIsOkForBoolean = booleanOperatorsList.includes(obj.op);
            if (!opIsOkForBoolean) {
              invalidBooleanOp.push(strForOpTypeError);
            }
            if (obj.value !== 'true' && obj.value !== 'false') {
              invalidBooleanVal.push(obj.atr);
            }
          }
          // numbers op ------------------
          else if (
            ['integer', 'smallint', 'bigint', 'float'].includes(
              entityAtrsAndTypes[obj.atr],
            )
          ) {
            const opIsOkForNumber = numberDateOperatorsList.includes(obj.op);
            if (!opIsOkForNumber) {
              invalidNumberOp.push(strForOpTypeError);
            }
            if (
              ['integer', 'smallint', 'bigint'].includes(
                entityAtrsAndTypes[obj.atr],
              )
            ) {
              if (obj.op === EQueryOperators.BETWEEN) {
                if (
                  !RE_INT_NUMBER_INCLUDE_0.test(<string>obj.value[0]) ||
                  !RE_INT_NUMBER_INCLUDE_0.test(<string>obj.value[1])
                ) {
                  invalidNumberVal.push(obj.atr);
                }
              } else if (obj.op === EQueryOperators.IN) {
                const invalidType = (<string[]>obj.value).some((value) => {
                  return !RE_INT_NUMBER_INCLUDE_0.test(<string>value);
                });
                if (invalidType) {
                  invalidNumberVal.push(obj.atr);
                }
              } else if (!RE_INT_NUMBER_INCLUDE_0.test(<string>obj.value)) {
                invalidNumberVal.push(obj.atr);
              }
            } else if (entityAtrsAndTypes[obj.atr] === 'float') {
              if (obj.op === EQueryOperators.BETWEEN) {
                if (
                  !RE_FLOAT_NUMBER.test(<string>obj.value[0]) ||
                  !RE_FLOAT_NUMBER.test(<string>obj.value[1])
                ) {
                  invalidNumberVal.push(obj.atr);
                }
              } else if (obj.op === EQueryOperators.IN) {
                const invalidType = (<string[]>obj.value).some((value) => {
                  return !RE_FLOAT_NUMBER.test(<string>value);
                });
                if (invalidType) {
                  invalidNumberVal.push(obj.atr);
                }
              } else if (!RE_FLOAT_NUMBER.test(<string>obj.value)) {
                invalidNumberVal.push(obj.atr);
              }
            }
          }
          // strings op ------------------
          else if (['char', 'varchar'].includes(entityAtrsAndTypes[obj.atr])) {
            const opIsOkForString = stringOperatorsList.includes(obj.op);
            if (!opIsOkForString) {
              invalidStringOp.push(strForOpTypeError);
            }
            if (obj.op === EQueryOperators.IN) {
              const invalidType = (<string[]>obj.value).some((value) => {
                return !value || value.length < 1 || value.length > 50;
              });
              if (invalidType) {
                invalidStringVal.push(obj.atr);
              }
            } else {
              if (!obj.value || obj.value.length < 1 || obj.value.length > 50) {
                invalidStringVal.push(obj.atr);
              }
            }
          }
          // date op ------------------
          else if (
            ['date', 'timestamp'].includes(entityAtrsAndTypes[obj.atr])
          ) {
            const opIsOkForDate = numberDateOperatorsList.includes(obj.op);
            if (!opIsOkForDate) {
              invalidDateOp.push(strForOpTypeError);
            }
            if (obj.op === EQueryOperators.BETWEEN) {
              const dateVal1 = parseISO(<string>obj.value[0]);
              const isValidDate1 = isValid(dateVal1);
              const dateVal2 = parseISO(<string>obj.value[1]);
              const isValidDate2 = isValid(dateVal2);
              if (!isValidDate1 || !isValidDate2) {
                invalidDateVal.push(obj.atr);
              }
            } else {
              const dateVal = parseISO(<string>obj.value);
              const isValidDate = isValid(dateVal);
              if (!isValidDate) {
                invalidDateVal.push(obj.atr);
              }
            }
          }
        }
      } else {
        invalidOps.push(`${obj.atr}: ${obj.op}`);
      }
    });

    const message = [];
    if (invalidAtrs && invalidAtrs.length) {
      const invalidAtrsStr = invalidAtrs.join(', ');
      message.push(
        `validation.common.GEN_QUERY_BAD_ATR|{"atrs":"${invalidAtrsStr}"}`,
      );
    }

    if (invalidStringOp && invalidStringOp.length > 0) {
      invalidStringOp.forEach((value) => {
        message.push(
          `validation.common.GEN_QUERY_BAD_OP_TYPE|{"type":"STRING",${value}}`,
        );
      });
    }
    if (invalidNumberVal && invalidNumberVal.length) {
      const invalidNumberValStr = invalidNumberVal.join(', ');
      message.push(
        `validation.common.GEN_QUERY_BAD_VAL_NUMBER|{"atrs":"${invalidNumberValStr}"}`,
      );
    }
    if (invalidNumberOp && invalidNumberOp.length > 0) {
      invalidNumberOp.forEach((value) => {
        message.push(
          `validation.common.GEN_QUERY_BAD_OP_TYPE|{"type":"NUMBER",${value}}`,
        );
      });
    }
    // Booleans errors ----------
    if (invalidBooleanVal && invalidBooleanVal.length) {
      const invalidBoolValStr = invalidBooleanVal.join(', ');
      message.push(
        `validation.common.GEN_QUERY_BAD_VAL_BOOLEAN|{"atrs":"${invalidBoolValStr}"}`,
      );
    }
    if (invalidBooleanOp && invalidBooleanOp.length) {
      invalidBooleanOp.forEach((value) => {
        message.push(
          `validation.common.GEN_QUERY_BAD_OP_TYPE|{"type":"BOOLEAN",${value}}`,
        );
      });
    }
    // Date errors ----------
    if (invalidDateVal && invalidDateVal.length) {
      const invalidDateValStr = invalidDateVal.join(', ');
      message.push(
        `validation.common.GEN_QUERY_BAD_VAL_DATE|{"atrs":"${invalidDateValStr}"}`,
      );
    }
    if (invalidDateOp && invalidDateOp.length > 0) {
      invalidDateOp.forEach((value) => {
        message.push(
          `validation.common.GEN_QUERY_BAD_OP_TYPE|{"type":"DATE or TIMESTAMP",${value}}`,
        );
      });
    }
    // Operators errors - ---------
    if (invalidOps && invalidOps.length) {
      const invalidOpsStr = invalidOps.join(', ');
      message.push(
        `validation.common.GEN_QUERY_BAD_OPS|{"ops":"${invalidOpsStr}"}`,
      );
    }
    if (message && message.length > 0) {
      throw new BadRequestException({ message });
    }

    return entityAtrsAndTypes;
  }

  private validateOrderBy(
    attributes: IQuerySort[],
    addAtrs: KeyValueObjectList<string>,
  ): KeyValueObjectList<string> {
    const entityAtrsAndTypes: KeyValueObjectList<string> = {};
    this.repo.metadata.columns.map((column) => {
      entityAtrsAndTypes[column.propertyName] = `${column.type}`;
    });
    if (addAtrs) {
      Object.assign(entityAtrsAndTypes, addAtrs);
    }

    const orderInvAtrName = [];
    const orderInvAtrDir = [];
    attributes.forEach((sortObj) => {
      const isAtrOk = entityAtrsAndTypes[sortObj.selector] !== undefined;
      if (!isAtrOk) {
        orderInvAtrName.push(sortObj.selector);
      }
      if (typeof sortObj.desc !== 'boolean') {
        orderInvAtrDir.push(
          `${sortObj.selector}: ${sortObj.desc}, boolean value expected`,
        );
      }
    });

    if (orderInvAtrName && orderInvAtrName.length) {
      const invalidStr = orderInvAtrName.join(', ');
      throw new BadRequestException({
        message: [
          `validation.common.GEN_QUERY_BAD_ATR|{"atrs":"${invalidStr}"}`,
        ],
      });
    }
    if (orderInvAtrDir && orderInvAtrDir.length) {
      const invalidStr = orderInvAtrDir.join(', ');
      throw new BadRequestException({
        message: [
          `validation.common.GEN_QUERY_BAD_ATR_DIR|{"atrs":"${invalidStr}"}`,
        ],
      });
    }
    return entityAtrsAndTypes;
  }
}
