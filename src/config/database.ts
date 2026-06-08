import * as dotenv from 'dotenv';
dotenv.config();

export const getDbConfig = () => {
  const dbType = process.env.DB_TYPE || 'sqlite';

  if (dbType === 'postgres') {
    return {
      type: 'postgres' as const,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'grid_event',
      entities: [__dirname + '/../entities/*.entity.{ts,js}'],
      synchronize: true,
      logging: false,
    };
  }

  return {
    type: 'sqlite' as const,
    database: process.env.SQLITE_DB_PATH || './data.sqlite',
    entities: [__dirname + '/../entities/*.entity.{ts,js}'],
    synchronize: true,
    logging: false,
  };
};
