import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

// import { IniciandoDB1682598632377 } from './migrations/1682598632377-IniciandoDB';
// import { LoadTerritoriesData1682598632377 } from './migrations/loadTerritoriesData';
import { ENTITIES } from './src/infrastructure/entities/entities';

config();

const env = new ConfigService();

export default new DataSource({
  type: 'postgres',
  url: env.get('DATABASE_URL'),
  entities: ENTITIES,
  migrations: [], // IniciandoDB1682598632377, LoadTerritoriesData1682598632377
});
