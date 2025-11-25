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

export type UserData = { user: { name: string } };
export type UserCountryData = {
  userData: { fullName: string; countryId: number; country: string };
};

export type EntitiesWithUserData<T> = T & UserData;
export type EntitiesWithUserCountryData<T> = T & UserCountryData;

export type QueryBase<
  T,
  U extends boolean | undefined = false,
  V extends boolean | undefined = false,
> = V extends true
  ? { entities: EntitiesWithUserCountryData<T>[]; itemCount: number }
  : U extends true
  ? { entities: EntitiesWithUserData<T>[]; itemCount: number }
  : {
    entities: T[];
    itemCount: number;
  };

export interface IQueryFilter {
  atr: string | null;
  op: EQueryOperators | null;
  value: string | string[] | null;
}

export interface IQuerySort {
  selector: string;
  desc: boolean;
}

interface IGetUserNameQuery {
  queryCount: SelectQueryBuilder<any> | null;
  queryList: SelectQueryBuilder<any>;
  addAtrs: KeyValueObjectList<string>;
}
export class BaseRepository {
  constructor(
    protected repo: Repository<any>,
    protected readonly logger: ApiLoggerService,
  ) { }

  protected atrIsIncludedAndGetValOp(
    filters: string | null,
    atributo: string,
    atrType: string,
    filterRef: string = 'value',
  ): { condition: string | null; value: string | null; value1: string | null } {
    const filterExist = filters && filters.length;
    let aFilters: IQueryFilter[] = [];
    if (filterExist) {
      try {
        aFilters = JSON.parse(filters);
      } catch (er) {
        const { message } = extractErrorDetails(er);
        this.logger.warn(`Gen query, bad atr filter error: ${message}`, {
          message: `${BaseRepository.name}: ${message}`,
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
        let value: string | null = null;
        let value1: string | null = null;
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
            value = obj.value && obj.value[0] ? obj.value[0] : null;
            value1 = obj.value && obj.value[1] ? obj.value[1] : null;
            condition = convertToDate
              ? `betteen DATE(:${filterRef}) and DATE(:${filterRef}1)`
              : `betteen :${filterRef} and :${filterRef}1`;
            break;
          case EQueryOperators.IN:
            value = <string>obj.value;
            condition = `in (:...${filterRef})`;
            break;
          default:
            value = <string>obj.value;
            break;
        }
        return { condition, value, value1 };
      }
    }
    return { condition: null, value: null, value1: null };
  }

  protected atrIsIncludedInOrder(
    sort: string,
    atrName: string,
  ): boolean | null {
    const sortExist = sort?.length ?? 0;
    if (sortExist) {
      let aSorts: IQuerySort[] = [];
      try {
        aSorts = JSON.parse(sort);
      } catch (er) {
        const { message } = extractErrorDetails(er);
        this.logger.warn(`Gen query, bad atr order error: ${message}`, {
          message: `${BaseRepository.name}: ${message}`,
        });
        throw new BadRequestException({
          message: [`validation.common.GEN_QUERY_BAD_SORT`],
        });
      }
      const obj = aSorts.find((sort) => sort.selector === atrName);
      return obj?.desc ?? null;
    }
    return null;
  }

  protected convertEnumFilterValues(
    filters: string | null,
    atributos: KeyValueObjectList<string>,
  ): string | null {
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
    let oldFilters: IQueryFilter[] = [];
    if (filterExist) {
      try {
        oldFilters = JSON.parse(filters);
      } catch (er) {
        const { message } = extractErrorDetails(er);
        this.logger.warn(
          `Gen query, bad atr filter (convert enum) error: ${message}`,
          { message: `${BaseRepository.name}: ${message}` },
        );
        throw new BadRequestException({
          message: [`validation.common.GEN_QUERY_BAD_FILTER`],
        });
      }
      const newFilters = oldFilters.map((filter) => {
        const atrKey = <string>filter.atr;
        if (atributos[atrKey]) {
          const myEnum = getEnumByName(atributos[atrKey]);
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
              values = [<string>filter.value];
            }
            values.map((value, index) => {
              const newValue = myEnum[value];
              if (newValue !== undefined) {
                transfValue[index] = newValue;
              } else {
                throw new BadRequestException({
                  message: [
                    `validation.common.GEN_QUERY_BAD_VAL_ENUM|{"atr":"${atrKey}: ${atributos[atrKey]}","value":"${filter.value}"}`,
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
    queryCount: SelectQueryBuilder<any> | null = null,
    queryList: SelectQueryBuilder<any>,
    filter: string | null = null,
  ): IGetUserNameQuery {
    const userName = filter
      ? this.atrIsIncludedAndGetValOp(filter, 'user.name', 'varchar')
      : null;

    if (userName && userName.condition) {
      queryList.addSelect([`user.full_name as "user.name"`]).withDeleted();
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
      const fullNameSubQuery = `(select "user"."full_name" from "public"."users" "user" WHERE "${alias}"."user_id" = "user"."id")`;
      queryList.addSelect(`${fullNameSubQuery} as "user.name"`);
    }

    const addAtrs: KeyValueObjectList<string> = {
      'user.name': 'varchar',
    };

    return { queryCount, queryList, addAtrs };
  }

  protected getUserNameCountryQuery(
    alias: string,
    queryCount: SelectQueryBuilder<any> | null = null,
    queryList: SelectQueryBuilder<any>,
    filter: string | null = null,
    sort: string | null = null,
  ): IGetUserNameQuery {
    const userName = filter
      ? this.atrIsIncludedAndGetValOp(filter, 'user.name', 'varchar')
      : null;
    const isSortedByCountry =
      this.atrIsIncludedInOrder(sort, 'country') !== null;

    const country = filter
      ? this.atrIsIncludedAndGetValOp(
        filter,
        'countryId',
        'smallint',
        'countryId',
      )
      : null;

    if (userName?.condition || country?.condition) {
      queryList
        .addSelect(['"user"."full_name" as "fullName"'])
        .addSelect(
          `json_build_object('fullName', "user"."full_name", 'countryId', "co"."id", 'country', "co"."iso2") as "userData"`,
        )
        .withDeleted();
      if (isSortedByCountry) {
        queryList
          .addSelect(['"co"."id" as "countryId"', '"co"."iso2" as "country"'])
          .withDeleted();
      } else {
        queryList.addSelect(`"co"."id" as "countryId"`).withDeleted();
      }
      if (!queryCount) {
        queryCount = this.repo.createQueryBuilder(alias);
      }
      if (userName?.condition) {
        const value = userName.value;
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
      }
    } else {
      if (isSortedByCountry) {
        queryList
          .addSelect(
            `json_build_object('fullName', "user"."full_name", 'countryId', "co"."id", 'country', "co"."iso2") as "userData"`,
          )
          .addSelect(`"co"."iso2" as "country"`)
          .withDeleted()
          .innerJoin(User, 'user', `${alias}.user_id = user.id`)
          .withDeleted();
      } else {
        const fullNameSubQuery = `(select json_build_object('fullName', "user"."full_name", 'countryId', "co"."id", 'country', "co"."iso2") as user
          from "public"."users" "user" left outer join countries "co" ON "co"."iso2" = "user"."country_code"
          WHERE "${alias}"."user_id" = "user"."id")`;
        queryList.addSelect(`${fullNameSubQuery} as "userData"`).withDeleted();
      }
    }
    if (isSortedByCountry) {
      const addAtrs: KeyValueObjectList<string> = {
        'user.name': 'varchar',
        countryId: 'smallint',
        country: 'varchar',
      };
      return { queryCount, queryList, addAtrs };
    } else {
      const addAtrs: KeyValueObjectList<string> = {
        'user.name': 'varchar',
        countryId: 'smallint',
      };
      return { queryCount, queryList, addAtrs };
    }
  }

  protected async getByQueryBase<
    T,
    U extends boolean | undefined = false,
    V extends boolean | undefined = false,
  >({
    queryDto,
    alias,
    queryCount = null,
    queryList = null,
    hasUserName,
    hasUserCountry,
    addAtrs = null,
    useSortDefault = true,
    analyticCount = false,
  }: {
    queryDto: GetGenericAllDto;
    alias: string;
    queryCount?: SelectQueryBuilder<any> | null;
    queryList?: SelectQueryBuilder<any> | null;
    hasUserName?: U;
    hasUserCountry?: V;
    addAtrs?: KeyValueObjectList<any> | null;
    useSortDefault?: boolean;
    analyticCount?: boolean;
  }): Promise<QueryBase<T, U, V>> {
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
    const includeUserName = hasUserName ?? false;
    const includeUserNameCountry = hasUserCountry ?? false;
    if (includeUserNameCountry) {
      const userNameCountry = this.getUserNameCountryQuery(
        alias,
        queryCount,
        queryList,
        queryDto.filter,
        queryDto.sort,
      );
      queryCount = userNameCountry.queryCount;
      queryList = userNameCountry.queryList;
      if (addAtrs) {
        Object.assign(addAtrs, userNameCountry.addAtrs);
      } else {
        addAtrs = userNameCountry.addAtrs;
      }
    } else if (includeUserName) {
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
    let sort: IQuerySort[] = [];
    if (sortExists) {
      try {
        sort = JSON.parse(<string>queryDto.sort);
      } catch (er) {
        const { message } = extractErrorDetails(er);
        this.logger.warn(`Gen query, bad atr sort error: ${message}`, {
          message: `${BaseRepository.name}: ${message}`,
        });
        throw new BadRequestException({
          message: [`validation.common.GEN_QUERY_BAD_SORT`],
        });
      }
      attributesTypes = this.validateOrderBy(sort, addAtrs);
    }
    const filterExist = queryDto.filter && queryDto.filter.length;
    let filter: IQueryFilter[] = [];
    if (filterExist) {
      try {
        filter = JSON.parse(<string>queryDto.filter);
      } catch (er) {
        const { message } = extractErrorDetails(er);
        this.logger.warn(`Gen query, bad atr filter error: ${message}`, {
          message: `${BaseRepository.name}: ${message}`,
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
        const isPersonalizedAtr =
          !!addAtrs && !!obj.atr && addAtrs[obj.atr] !== undefined;
        if (queryCount && obj.atr && !isPersonalizedAtr) {
          const { condition, val } = this.getCondition(
            attributesTypes[obj.atr],
            alias,
            obj,
            isPersonalizedAtr,
            index,
          );
          queryCount.andWhere(condition, val);
          queryList?.andWhere(condition, val);
        }
      });
    }

    let itemCount = 0;
    if (queryCount) {
      if (analyticCount) {
        const subQuerySQL = queryList.getSql();
        const subQueryParams = queryList.getParameters();
        const subQueryParamsArray = Object.values(subQueryParams);
        const finalSQL = `SELECT COUNT(1) AS "total" FROM (${subQuerySQL}) AS "temp"`;
        const totalCountQuery = await this.repo.manager.query(
          finalSQL,
          subQueryParamsArray,
        );
        itemCount = parseInt(totalCountQuery[0].total);
      } else {
        itemCount = await queryCount.withDeleted().getCount();
      }
    }
    if (itemCount === 0) {
      return {
        entities: [],
        itemCount,
      } as QueryBase<T, U, V>;
    }
    if (sortExists) {
      let orderMoreThanOne = false;
      sort.forEach((obj) => {
        const order =
          obj.desc === true || `${obj.desc}` === 'true' || obj.desc
            ? 'DESC'
            : 'ASC';
        const selector = isPersonalized
          ? `"${obj.selector}"`
          : `${alias}.${obj.selector}`;
        if (orderMoreThanOne) {
          queryList?.addOrderBy(selector, order);
        } else {
          queryList?.orderBy(selector, order);
          orderMoreThanOne = true;
        }
      });
    } else if (useSortDefault) {
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
      const raw = await queryList.getRawMany<T>();
      return {
        entities: raw,
        itemCount,
      } as QueryBase<T, U, V>;
    } else {
      const { entities } = await queryList.getRawAndEntities<T>();
      return {
        entities: entities as T[],
        itemCount,
      } as QueryBase<T, U, V>;
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
      : obj.value && obj.value.toUpperCase() === 'NULL'
        ? `${alias}${obj.atr} ${obj.op === '<>' ? 'is not' : 'is'} null`
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
    addAtrs: KeyValueObjectList<string> | null,
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

    const invalidAtrs: string[] = [];
    const invalidOps: string[] = [];
    const invalidBooleanVal: string[] = [];
    const invalidBooleanOp: string[] = [];
    const invalidNumberVal: string[] = [];
    const invalidNumberOp: string[] = [];
    const invalidNumberSize: string[] = [];
    const invalidStringVal: string[] = [];
    const invalidStringOp: string[] = [];
    const invalidDateOp: string[] = [];
    const invalidDateVal: string[] = [];
    attributes.forEach((obj) => {
      const isAtrOk = obj.atr && entityAtrsAndTypes[obj.atr] !== undefined;
      if (obj.atr && !isAtrOk) {
        invalidAtrs.push(obj.atr);
      }
      const opIsOk =
        typeof obj.value === 'string' &&
          obj.value &&
          obj.value.toUpperCase() === 'NULL'
          ? obj.op &&
          [EQueryOperators.EQUAL, EQueryOperators.NOT_EQUAL].includes(obj.op)
          : obj.op && operatorsList.includes(obj.op);
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
          if (obj.atr && entityAtrsAndTypes[obj.atr] === 'boolean') {
            const opIsOkForBoolean =
              obj.op && booleanOperatorsList.includes(obj.op);
            if (!opIsOkForBoolean) {
              invalidBooleanOp.push(strForOpTypeError);
            }
            if (obj.value !== 'true' && obj.value !== 'false') {
              invalidBooleanVal.push(obj.atr);
            }
          }
          // numbers op ------------------
          else if (
            obj.atr &&
            ['integer', 'smallint', 'bigint', 'float'].includes(
              entityAtrsAndTypes[obj.atr],
            )
          ) {
            const opIsOkForNumber =
              obj.op && numberDateOperatorsList.includes(obj.op);
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
                  !obj.value ||
                  !RE_INT_NUMBER_INCLUDE_0.test(<string>obj.value[0]) ||
                  !RE_INT_NUMBER_INCLUDE_0.test(<string>obj.value[1])
                ) {
                  invalidNumberVal.push(obj.atr);
                } else if (
                  ['integer', 'smallint'].includes(entityAtrsAndTypes[obj.atr])
                ) {
                  const intVal0 = Math.abs(Number(obj.value[0]));
                  const intVal1 = Math.abs(Number(obj.value[1]));
                  const isSmallWrong =
                    entityAtrsAndTypes[obj.atr] === 'smallint' &&
                    (intVal0 > 32767 || intVal1 > 32767);
                  const isWrong =
                    entityAtrsAndTypes[obj.atr] === 'integer' &&
                    (intVal0 > 2147483647 || intVal1 > 2147483647);
                  if (isSmallWrong || isWrong) {
                    invalidNumberSize.push(obj.atr);
                  }
                }
              } else if (obj.op === EQueryOperators.IN) {
                const invalidType = (<string[]>obj.value).some((value) => {
                  return !RE_INT_NUMBER_INCLUDE_0.test(<string>value);
                });
                if (invalidType) {
                  invalidNumberVal.push(obj.atr);
                } else if (
                  ['integer', 'smallint'].includes(entityAtrsAndTypes[obj.atr])
                ) {
                  const invalidType = (<string[]>obj.value).some((value) => {
                    const intVal = Math.abs(Number(value));
                    const isSmallWrong =
                      obj.atr &&
                      entityAtrsAndTypes[obj.atr] === 'smallint' &&
                      intVal > 32767;
                    const isWrong =
                      obj.atr &&
                      entityAtrsAndTypes[obj.atr] === 'integer' &&
                      intVal > 2147483647;
                    return isWrong || isSmallWrong;
                  });
                  if (invalidType) {
                    invalidNumberSize.push(obj.atr);
                  }
                }
              } else if (
                obj.value !== 'NULL' &&
                obj.value !== 'null' &&
                !RE_INT_NUMBER_INCLUDE_0.test(<string>obj.value)
              ) {
                invalidNumberVal.push(obj.atr);
              } else if (
                ['integer', 'smallint'].includes(entityAtrsAndTypes[obj.atr])
              ) {
                if (obj.value !== 'NULL' && obj.value !== 'null') {
                  const intVal = Math.abs(Number(obj.value));
                  const isSmallWrong =
                    entityAtrsAndTypes[obj.atr] === 'smallint' &&
                    intVal > 32767;
                  const isWrong =
                    entityAtrsAndTypes[obj.atr] === 'integer' &&
                    intVal > 2147483647;
                  if (isWrong || isSmallWrong) {
                    invalidNumberSize.push(obj.atr);
                  }
                }
              }
            } else if (entityAtrsAndTypes[obj.atr] === 'float') {
              if (obj.op === EQueryOperators.BETWEEN) {
                if (
                  !obj.value ||
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
              } else if (
                obj.value !== 'NULL' &&
                obj.value !== 'null' &&
                !RE_FLOAT_NUMBER.test(<string>obj.value)
              ) {
                invalidNumberVal.push(obj.atr);
              }
            }
          }
          // strings op ------------------
          else if (
            obj.atr &&
            ['char', 'varchar'].includes(entityAtrsAndTypes[obj.atr])
          ) {
            const opIsOkForString =
              obj.op && stringOperatorsList.includes(obj.op);
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
            obj.atr &&
            ['date', 'timestamp'].includes(entityAtrsAndTypes[obj.atr])
          ) {
            const opIsOkForDate =
              obj.op && numberDateOperatorsList.includes(obj.op);
            if (!opIsOkForDate) {
              invalidDateOp.push(strForOpTypeError);
            }
            if (obj.value && obj.op === EQueryOperators.BETWEEN) {
              const dateVal1 = parseISO(<string>obj.value[0]);
              const isValidDate1 = isValid(dateVal1);
              const dateVal2 = parseISO(<string>obj.value[1]);
              const isValidDate2 = isValid(dateVal2);
              if (!isValidDate1 || !isValidDate2) {
                invalidDateVal.push(obj.atr);
              }
            } else {
              const dateVal = parseISO(<string>obj.value);
              const isValidDate =
                (typeof obj.value === 'string' &&
                  obj.value &&
                  obj.value.toUpperCase() === 'NULL') ||
                isValid(dateVal);
              if (!isValidDate) {
                invalidDateVal.push(obj.atr);
              }
            }
          }
        }
      } else {
        invalidOps.push(`${obj.atr}: ${obj.op} ${obj.value}`);
      }
    });

    const message: string[] = [];
    if (invalidAtrs.length) {
      const invalidAtrsStr = invalidAtrs.join(', ');
      message.push(
        `validation.common.GEN_QUERY_BAD_ATR|{"atrs":"${invalidAtrsStr}"}`,
      );
    }

    if (invalidStringOp.length > 0) {
      invalidStringOp.forEach((value) => {
        message.push(
          `validation.common.GEN_QUERY_BAD_OP_TYPE|{"type":"STRING",${value}}`,
        );
      });
    }
    if (invalidNumberVal.length) {
      const invalidNumberValStr = invalidNumberVal.join(', ');
      message.push(
        `validation.common.GEN_QUERY_BAD_VAL_NUMBER|{"atrs":"${invalidNumberValStr}"}`,
      );
    }
    if (invalidNumberSize.length) {
      const invalidNumberSizeStr = invalidNumberSize.join(', ');
      message.push(
        `validation.common.GEN_QUERY_BAD_VAL_NUMBER_SIZE|{"atrs":"${invalidNumberSizeStr}"}`,
      );
    }
    if (invalidNumberOp.length > 0) {
      invalidNumberOp.forEach((value) => {
        message.push(
          `validation.common.GEN_QUERY_BAD_OP_TYPE|{"type":"NUMBER",${value}}`,
        );
      });
    }
    // Booleans errors ----------
    if (invalidBooleanVal.length) {
      const invalidBoolValStr = invalidBooleanVal.join(', ');
      message.push(
        `validation.common.GEN_QUERY_BAD_VAL_BOOLEAN|{"atrs":"${invalidBoolValStr}"}`,
      );
    }
    if (invalidBooleanOp.length) {
      invalidBooleanOp.forEach((value) => {
        message.push(
          `validation.common.GEN_QUERY_BAD_OP_TYPE|{"type":"BOOLEAN",${value}}`,
        );
      });
    }
    // Date errors ----------
    if (invalidDateVal.length) {
      const invalidDateValStr = invalidDateVal.join(', ');
      message.push(
        `validation.common.GEN_QUERY_BAD_VAL_DATE|{"atrs":"${invalidDateValStr}"}`,
      );
    }
    if (invalidDateOp.length > 0) {
      invalidDateOp.forEach((value) => {
        message.push(
          `validation.common.GEN_QUERY_BAD_OP_TYPE|{"type":"DATE or TIMESTAMP",${value}}`,
        );
      });
    }
    // Operators errors - ---------
    if (invalidOps.length) {
      const invalidOpsStr = invalidOps.join(', ');
      let technicalError = '';
      if (invalidOpsStr.includes('NULL') || invalidOpsStr.includes('null')) {
        technicalError = `,"technicalError":"For NULL values only use = and <> operators; check"`;
      }
      message.push(
        `validation.common.GEN_QUERY_BAD_OPS|{"ops":"${invalidOpsStr}"${technicalError}}`,
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

    const orderInvAtrName: string[] = [];
    const orderInvAtrDir: string[] = [];
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
