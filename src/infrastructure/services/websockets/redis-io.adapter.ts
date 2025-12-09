import { Inject } from '@nestjs/common';
import * as IORedis from 'ioredis';
import * as os from 'os';
import { extractErrorDetails } from 'src/infrastructure/common/utils/extract-error-details';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';
import { IApiLogger } from '../logger/logger.interface';
import { API_LOGGER_KEY } from '../logger/logger.module';
import { getRedisConfForIoAdapter } from '../redis/redis.config';

export class RedisAdapter {
  private readonly redisIOClient: IORedis.Redis;
  private readonly contextTitle = `Host ${os.hostname()}; RedisAdapter, `;
  private readonly context = `${RedisAdapter.name}.`;

  constructor(
    private readonly configService: EnvironmentConfigService,
    @Inject(API_LOGGER_KEY) private readonly logger: IApiLogger,
  ) {
    const options = getRedisConfForIoAdapter(this.configService);
    this.redisIOClient = new IORedis.Redis(options);
  }

  onModuleInit() {
    this.redisIOClient.on('error', (er: unknown) => {
      const { message } = extractErrorDetails(er);
      this.logger.error(`${this.contextTitle}connection error: {message}`, {
        context: `${this.context}onError`,
        message,
      });
    });

    this.redisIOClient.on('connect', () => {
      this.logger.debug(`${this.contextTitle}connected to Redis successfully`, {
        context: `${this.context}onConnect`,
        host: this.redisIOClient.options.host ?? 'unknow',
      });
    });

    this.redisIOClient.on('close', () => {
      this.logger.verbose('{message}', {
        context: `${this.context}onClose`,
        message: `${this.contextTitle}connection to Redis closed`,
      });
    });

    this.redisIOClient.on('reconnecting', (delay) => {
      this.logger.verbose(
        `${this.contextTitle}reconnecting to Redis in ${delay} ms`,
        {
          context: `${this.context}onReconnecting`,
        },
      );
    });

    this.redisIOClient.on('end', () => {
      this.logger.warn('{message}', {
        message: `${this.contextTitle}connection to Redis ended`,
        context: `${this.context}onEnd`,
      });
    });
  }

  onModuleDestroy() {
    this.redisIOClient.quit();
  }

  getRedisClient(): IORedis.Redis {
    return this.redisIOClient;
  }
}
