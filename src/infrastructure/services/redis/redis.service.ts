import { Inject, Injectable } from '@nestjs/common';
import * as IORedis from 'ioredis';
import snappy from 'snappy';
import { IRedisService } from 'src/domain/adapters/redis.interface';
import { extractErrorDetails } from 'src/infrastructure/common/utils/extract-error-details';
import { generateIntegerRandom } from 'src/infrastructure/common/utils/random';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { ApiLoggerService } from '../logger/logger.service';
import { RedisAdapter } from '../websockets/redis-io.adapter';
import { getRedisConfForIoAdapter } from './redis.config';

@Injectable()
export class ApiRedisService implements IRedisService {
  private contextTitle = '[REDIS-SERV] ';
  private context = 'ApiRedisService.';
  private redisService: IORedis.Redis;

  constructor(
    private readonly appConfig: EnvironmentConfigService,
    private readonly logger: ApiLoggerService,
    @Inject('REDIS_ADAPTER') private redisAdapter: RedisAdapter,
  ) {
    this.redisService = this.redisAdapter.getRedisClient();
  }

  /**
   * @description get the set saved values for sended key
   * @param key redis key
   * @returns a set of unique values as string
   */
  async getSetMembers(key: string): Promise<string[] | undefined> {
    try {
      return await this.redisService.smembers(key.toUpperCase());
    } catch (er) {
      const { message } = extractErrorDetails(er);
      this.logger.error(
        `${this.contextTitle}GET value: Ends with error; {message}`,
        {
          context: `${this.context}get.catch`,
          key,
          message,
          marker: 'REDIS-ERROR',
        },
      );
    }
  }
  /**
   * @description adds new members to a set of unique values
   * @param key redis key
   * @param values the new values to add
   * @param ttl key time to live in seconds, send 0 to set to permanent (not recommended)
   */
  async addSetMembers(
    key: string,
    values: string[],
    ttl?: number,
  ): Promise<void> {
    if (values.length === 0) {
      return;
    }
    try {
      await this.redisService.sadd(key.toUpperCase(), ...values);
      if (ttl > 0) {
        await this.redisService.expire(key.toUpperCase(), ttl);
      }
    } catch (er) {
      const { message } = extractErrorDetails(er);
      this.logger.error(
        `${this.contextTitle}GET value: Ends with error; {message}`,
        {
          context: `${this.context}get.catch`,
          key,
          message,
          marker: 'REDIS-ERROR',
        },
      );
    }
  }

  /**
   * @description get saved value for sended key
   *
   * @param key redis key
   * @param lock indicate to lock used key for writing, when key is writen, lock is removed
   * @returns value or undefined if key do not exist
   */
  async get<T>(key: string): Promise<T | undefined> {
    const data = await this.redisService.get(key.toUpperCase());
    try {
      return data ? (JSON.parse(data) as T) : null;
    } catch {
      return data as T;
    }
  }

  /**
   * @description verify and lock key, if not locked
   *
   * @param key redis key
   * @param ttl max time to free lock, security unlock, default 2secs
   * @param timeToReview number of ms to wait and review lock status, default 80ms
   *                     depends on minProcess time
   */
  async lock(
    key: string,
    ttl = 2,
    timeToReview = 80,
    debug = false,
  ): Promise<boolean> {
    // random delay to separate requests
    const mov = Math.floor(timeToReview * 0.4);
    const min = timeToReview - mov;
    const max = timeToReview + mov;
    const initDelay = generateIntegerRandom(min, max);
    await new Promise((resolve) => setTimeout(resolve, initDelay)); // wait XXms

    const lockKey = `${key}:LOCK`;
    const contextTitle = `${this.contextTitle}Lock key ({key}): `;
    const context = `${this.context}lock`;
    let holded = false;
    let isLocked = await this.get<boolean>(lockKey);
    if (isLocked) {
      holded = true;
      if (debug) {
        this.logger.debug(`${contextTitle}Is locked`, {
          mov,
          min,
          max,
          context,
          key,
        });
      }
      while (isLocked) {
        timeToReview = generateIntegerRandom(min, max);
        if (debug) {
          this.logger.debug(`${contextTitle}In hold for {timeToReview}ms`, {
            context,
            timeToReview,
            key,
          });
        }
        await new Promise((resolve) => setTimeout(resolve, timeToReview)); // wait XXms
        isLocked = <boolean>((await this.redisService.get(lockKey)) as unknown);
      }
    }
    if (debug) {
      this.logger.debug(`${contextTitle}Free, so lock and go`, {
        context,
        key,
      });
    }
    await this.set<boolean>(lockKey, true, ttl);
    return holded;
  }

  /**
   * @description unlock key
   *
   * @param key redis key to unlock
   */
  async unlock(key: string, debug = false) {
    const lockKey = `${key}:LOCK`;
    await this.del(lockKey);
    if (debug) {
      this.logger.debug(`${this.contextTitle}Unlock key: Free lock`, {
        context: `${this.context}unlock`,
        key,
      });
    }
  }

  /**
   * @description get ttl value in secods for sended key
   *
   * @param key redis key
   * @returns tt value or undefined if key do not exist
   */
  async ttl(key: string): Promise<number | undefined> {
    try {
      return await this.redisService.ttl(key.toUpperCase());
    } catch (er: unknown) {
      const { message } = extractErrorDetails(er);
      this.logger.error(
        `${this.contextTitle}GET ttl value: Ends with error; {message}`,
        {
          context: `${this.context}ttl.catch`,
          key,
          message,
          marker: 'REDIS-ERROR',
        },
      );
    }
  }
  /**
   * Sets a value in redis with a compresion to reduce his size in cache
   * @param key
   * @param value
   * @param ttl if ignored then the expiration time of the key will be -1
   */
  async setCompressed(key: string, value: string, ttl?: number) {
    try {
      const compressed = await snappy.compress(value);
      const base64String = compressed.toString('base64');
      await this.set(key, base64String, ttl);
    } catch (er) {
      const { message } = extractErrorDetails(er);
      this.logger.error(
        `${this.contextTitle}Set compressed value: Ends with error; {message}`,
        {
          context: `${this.context}setCompressed.catch`,
          key,
          message,
          marker: 'REDIS-ERROR',
        },
      );
    }
  }

  /**
   * Get a cached value in redis that has been compresed
   * @param key
   * @returns
   */
  async getDescompressed<T>(key: string): Promise<T> {
    try {
      const base64String = await this.get<string>(key);

      if (base64String) {
        const bufferBase64 = Buffer.from(base64String, 'base64');
        const descompressed = await snappy.uncompress(bufferBase64, {
          asBuffer: false,
        });
        return JSON.parse(descompressed.toString());
      } else {
        return undefined;
      }
    } catch (er) {
      const { message } = extractErrorDetails(er);
      this.logger.error(
        `${this.contextTitle}Get descompressed  value: Ends with error; {message}`,
        {
          context: `${this.context}getDescompressed.catch`,
          key,
          message,
          marker: 'REDIS-ERROR',
        },
      );
    }
  }

  /**
   * @description set a value to redis key
   *
   * @param key redis key
   * @param value value to save, may be and object or any other data type
   * @param ttl time to save in segs. Set to 0 or ignore if its permanent
   * @param keepTtl indicate if maintain (true) o restart ttl value
   */
  async set<T>(
    key: string,
    value: T,
    ttl?: number,
    keepTtl = false,
  ): Promise<void> {
    try {
      if (keepTtl) {
        const sameTtl = await this.ttl(key);
        if (sameTtl > 0) {
          ttl = sameTtl;
        }
      }
      //* console.log(`Creando cache para key+'${key}' con ttl=${ttl}`);
      key = key.toUpperCase();
      if (ttl && ttl > 0) {
        await this.redisService.set(key, JSON.stringify(value));
        await this.redisService.expire(key, ttl);
      } else {
        await this.redisService.set(key, JSON.stringify(value));
      }
    } catch (er: unknown) {
      const { message } = extractErrorDetails(er);

      this.logger.error(
        `${this.contextTitle}SET value: Ends with error; {message}`,
        {
          context: `${this.context}set.catch`,
          key,
          data: Array.isArray(value)
            ? value.length > 0
              ? value[0]
              : []
            : value,
          ttl,
          message,
          marker: 'REDIS-ERROR',
        },
      );
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redisService.del(key.toUpperCase());
    } catch (er: unknown) {
      const { message } = extractErrorDetails(er);
      this.logger.error(
        `${this.contextTitle}DELETE value: Ends with error; {message}`,
        {
          context: `${this.context}del.catch`,
          key,
          message,
          marker: 'REDIS-ERROR',
        },
      );
    }
  }
  /**
   * @description Finds if a set of keys exist in redis
   * @param keys redis keys to find if exist
   * @returns
   */
  async existKeys(keys: string[]): Promise<boolean> {
    try {
      const mapedKeys = keys.map((k) => k.toUpperCase());
      const match = await this.redisService.exists(mapedKeys);
      return match > 0;
    } catch (er) {
      const { message } = extractErrorDetails(er);
      this.logger.error(
        `${this.contextTitle}EXIST keys: Ends with error; {message}`,
        {
          context: `${this.context}exist.catch`,
          keys,
          message,
          marker: 'REDIS-ERROR',
        },
      );
    }
  }

  async exist(key: string): Promise<boolean> {
    try {
      const match = await this.redisService.exists([key.toUpperCase()]);
      return match > 0;
    } catch (er: unknown) {
      const { message } = extractErrorDetails(er);
      this.logger.error(
        `${this.contextTitle}EXIST value: Ends with error; {message}`,
        {
          context: `${this.context}exist.catch`,
          key,
          message,
          marker: 'REDIS-ERROR',
        },
      );
    }
  }

  /**
   * @description set a field in a hash
   *
   * @param key redis key
   * @param field field name in the hash
   * @param value value to save
   */

  async hset<T extends string | number | Buffer>(
    key: string,
    field: string,
    value: T,
  ): Promise<void> {
    try {
      await this.redisService.hset(key.toUpperCase(), field, value);
    } catch (er: unknown) {
      const { message } = extractErrorDetails(er);
      this.logger.error(
        `${this.contextTitle}HSET value: Ends with error; {message}`,
        {
          context: `${this.context}hset.catch`,
          key,
          field,
          value,
          message,
          marker: 'REDIS-ERROR',
        },
      );
    }
  }

  /**
   * @description get a field from a hash
   *
   * @param key redis key
   * @param field field name in the hash
   * @returns value or undefined if key/field do not exist
   */

  async hget<T>(key: string, field: string): Promise<T | undefined> {
    try {
      return <T>await this.redisService.hget(key.toUpperCase(), field);
    } catch (er: unknown) {
      const { message } = extractErrorDetails(er);
      this.logger.error(
        `${this.contextTitle}HGET value: Ends with error; {message}`,
        {
          context: `${this.context}hget.catch`,
          key,
          field,
          message,
          marker: 'REDIS-ERROR',
        },
      );
    }
  }

  /**
   * @description delete a field from a hash
   *
   * @param key redis key
   * @param field field name in the hash
   */

  async hdel(key: string, field: string): Promise<void> {
    try {
      await this.redisService.hdel(key.toUpperCase(), field);
    } catch (er: unknown) {
      const { message } = extractErrorDetails(er);
      this.logger.error(
        `${this.contextTitle}HDEL value: Ends with error; {message}`,
        {
          context: `${this.context}hdel.catch`,
          key,
          field,
          message,
          marker: 'REDIS-ERROR',
        },
      );
    }
  }

  /**
   * @description get all fields and values from a hash
   *
   * @param key redis key
   * @returns object containing all fields and values or undefined if key does not exist
   */

  async hgetall<T>(key: string): Promise<Record<string, T> | undefined> {
    try {
      return <Record<string, T>>(
        await this.redisService.hgetall(key.toUpperCase())
      );
    } catch (er: unknown) {
      const { message } = extractErrorDetails(er);
      this.logger.error(
        `${this.contextTitle}HGETALL value: Ends with error; {message}`,
        {
          context: `${this.context}hgetall.catch`,
          key,
          message,
          marker: 'REDIS-ERROR',
        },
      );
    }
  }

  async removeFromSet(key: string, elements: string[]): Promise<void> {
    try {
      await this.redisService.srem(key.toUpperCase(), ...elements);
      const current = await this.redisService.scard(key.toUpperCase());
      if (current === 0) {
        await this.redisService.del(key.toUpperCase());
      }
    } catch (er) {
      const { message } = extractErrorDetails(er);
      this.logger.warn(
        `${this.contextTitle}remove elements from set: Ends with error; {message}`,
        {
          context: `${this.context}removeFromSet.catch`,
          key,
          elements,
          message,
          marker: 'REDIS-ERROR',
        },
      );
    }
  }

  async removeAllKeysWithPattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';

      const prefix = this.getKeyPrefix();
      const fullPattern = `${prefix}${pattern}`;
      do {
        const [newCursor, keys] = await this.redisService.scan(
          cursor,
          'MATCH',
          fullPattern.toUpperCase(),
          'COUNT',
          100,
        );
        const pipeline = this.redisService.pipeline();
        const keysToDelete: string[] = [];
        keys.forEach((key) => {
          const cleanKey = key.replace(prefix, '');
          keysToDelete.push(cleanKey);
        });
        pipeline.del(keysToDelete);
        await pipeline.exec();
        cursor = newCursor;
      } while (cursor != '0');
    } catch (er) {
      const { message } = extractErrorDetails(er);
      this.logger.error(
        `${this.contextTitle}removeAllKeysWithPattern: Ends with error; {message}`,
        {
          context: `${this.context}removeAllKeysWithPattern.catch`,
          pattern,
          message,
          marker: 'REDIS-ERROR',
        },
      );
    }
  }

  async getAllKeysWithPattern(pattern: string): Promise<string[]> {
    try {
      let cursor = '0';

      const prefix = this.getKeyPrefix();
      const fullPattern = `${prefix}${pattern}`;
      const matchKeys: string[] = [];
      do {
        const [newCursor, keys] = await this.redisService.scan(
          cursor,
          'MATCH',
          fullPattern.toUpperCase(),
          'COUNT',
          100,
        );

        keys.forEach((key) => {
          const cleanKey = key.replace(prefix, '');
          matchKeys.push(cleanKey);
        });
        cursor = newCursor;
      } while (cursor != '0');

      return matchKeys;
    } catch (er) {
      const { message } = extractErrorDetails(er);
      this.logger.warn(
        `${this.contextTitle}getAllKeysWithPattern: Ends with error; {message}`,
        {
          context: `${this.context}getAllKeysWithPattern.catch`,
          pattern,
          message,
          marker: 'REDIS-ERROR',
        },
      );
      return [];
    }
  }

  client() {
    return this.redisService;
  }

  getKeyPrefix() {
    const config = getRedisConfForIoAdapter(this.appConfig);
    const prefix = config.keyPrefix;
    return prefix;
  }
}
