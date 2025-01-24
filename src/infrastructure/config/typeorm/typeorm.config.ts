import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ENTITIES } from 'src/infrastructure/entities/entities';
import { ApiLoggerService } from 'src/infrastructure/services/logger/logger.service';
import { EnvironmentConfigService } from '../environment-config/environment-config.service';
import { TypeOrmSeqLoggerAdapter } from './typeOrmSeqLoggerAdapter';

export const getTypeOrmModuleOptions = (
  envCfgServ: EnvironmentConfigService,
  myLogger: ApiLoggerService,
): TypeOrmModuleOptions => {
  const sslCert = envCfgServ.getDatabaseSslCert();
  if (sslCert === 'none') {
    const options: TypeOrmModuleOptions = {
      type: 'postgres',
      url: envCfgServ.getDatabaseUrl(),
      entities: ENTITIES,
      synchronize: envCfgServ.getDatabaseSync(),
      schema: envCfgServ.getDatabaseSchema(),
      maxQueryExecutionTime: envCfgServ.getDatabaseSlowQueryMaxTime(),
      logging: envCfgServ.getDatabaseLogs(),
      logger: new TypeOrmSeqLoggerAdapter(myLogger),
      // migrations: ['src/migrations/**/*.ts'],
      migrationsRun: false,
    };
    //* console.log(JSON.stringify(options, null, 2));
    return options;
  }
  const options: TypeOrmModuleOptions = {
    type: 'postgres',
    url: envCfgServ.getDatabaseUrl(),
    ssl: true,
    extra: {
      ssl: {
        rejectUnauthorized: false,
        ca: sslCert,
      },
    },
    entities: ENTITIES,
    synchronize: envCfgServ.getDatabaseSync(),
    schema: envCfgServ.getDatabaseSchema(),
    maxQueryExecutionTime: envCfgServ.getDatabaseSlowQueryMaxTime(),
    logging: envCfgServ.getDatabaseLogs(),
    logger: new TypeOrmSeqLoggerAdapter(myLogger),
    migrationsRun: false,
  };
  //* console.log(JSON.stringify(options, null, 2));
  return options;
};
