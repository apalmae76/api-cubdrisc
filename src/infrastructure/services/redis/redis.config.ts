import { RedisOptions } from 'ioredis';
import * as os from 'os';
import { RedisClientOptions, RedisModules } from 'redis';
import { EnvironmentConfigService } from 'src/infrastructure/config/environment-config/environment-config.service';

export const getRedisConfForBull = (envCfgServ: EnvironmentConfigService) => {
  const password = envCfgServ.getRedisPass();
  const prefix = `${envCfgServ
    .getAppName()
    .replace(/\s/g, '-')}:${envCfgServ.getNodeEnv()}:BULL-QUEUE`.toUpperCase();
  const options = {
    prefix,
    redis: {
      // store: redisStore,
      host: envCfgServ.getRedisHost(),
      port: envCfgServ.getRedisPort(),
      username: 'default',
      password,
      // tls: {},
      maxRetriesPerRequest: 5,
    },
  };
  if (password === '' || password === 'none') {
    delete options.redis.username;
    delete options.redis.password;
    // delete options.redis.store;
    // delete options.redis.tls;
  }
  //* console.log(options);
  return options;
};

export const getRedisConfForIoAdapter = (
  envCfgServ: EnvironmentConfigService,
): RedisOptions => {
  const password = envCfgServ.getRedisPass();
  const prefix = `${envCfgServ
    .getAppName()
    .replace(/\s/g, '-')}:${envCfgServ.getNodeEnv()}:`.toUpperCase();
  const options: RedisOptions = {
    host: envCfgServ.getRedisHost(),
    port: envCfgServ.getRedisPort(),
    username: 'default',
    password,
    // tls: {},
    keyPrefix: prefix,
    maxRetriesPerRequest: 5,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    connectionName: `RedisAdapter-${os.hostname()}`,
  };
  if (password === '' || password === 'none') {
    delete options.username;
    delete options.password;
    // delete options.tls;
  }
  //* console.log(options);
  return options;
};

export const getRedisConfForRedisNodeAdapter = (
  envConfgServ: EnvironmentConfigService,
): RedisClientOptions<
  RedisModules,
  Record<string, never>,
  Record<string, never>
> => {
  const url = `redis://${envConfgServ.getRedisHost()}:${envConfgServ.getRedisPort()}`;
  const password = envConfgServ.getRedisPass();

  return {
    url,
    password,
    username: 'default',
  };
};
