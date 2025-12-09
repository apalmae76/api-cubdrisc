import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { IApiLogger } from '../logger/logger.interface';
import { API_LOGGER_KEY } from '../logger/logger.module';
import { REDIS_SERVICE_KEY } from '../redis/redis.module';
import { ApiRedisService } from '../redis/redis.service';
import { KEYS_TO_DELETE_ON_UPDATE } from './constants';

@Injectable()
export class SystemService implements OnModuleInit {
  private readonly contexTitle = `[SYSTEM]`;
  private readonly context = `${SystemService.name}.`;

  constructor(
    @Inject(REDIS_SERVICE_KEY) private readonly redisService: ApiRedisService,
    @Inject(API_LOGGER_KEY) private readonly loggerService: IApiLogger,
  ) { }

  async onModuleInit() {
    await this.cleanCacheForSystemKeys();
  }

  /**
   * Cleans the cache for keys defined as system keys.
   * This keys need to be reset on cache when the api restarts.
   */
  private async cleanCacheForSystemKeys() {
    const contexTitle = `${this.contexTitle} clean system cache keys from redis`;
    const context = `${this.context}cleanCacheForSystemKeys`;
    this.loggerService.debug(`${contexTitle}, start`, {
      context,
    });
    // key for used to store the array of sistem keys used;
    const keysToDeleteOnUpdate: string[] = [...KEYS_TO_DELETE_ON_UPDATE];
    if (!keysToDeleteOnUpdate) {
      this.loggerService.debug(
        `${contexTitle}, ended (no need to clean - no keys set)`,
        {
          context,
        },
      );
      return;
    }

    if (keysToDeleteOnUpdate.length === 0) {
      this.loggerService.debug(
        `${contexTitle}, ended (no need to clean - no keys set)`,
        {
          context,
        },
      );
      return;
    }
    let deletedCount = 0;
    const updatedKeys = [...keysToDeleteOnUpdate];
    for (const key of keysToDeleteOnUpdate) {
      const index = updatedKeys.findIndex((item) => item === key);
      if (index >= 0) {
        await this.redisService.del(key);
        updatedKeys.splice(index, 1);
        deletedCount++;
      }
    }

    this.loggerService.debug(
      `${contexTitle}, ended (total keys removed: ${deletedCount})`,
      {
        context,
        deletedCount,
      },
    );
  }
}
