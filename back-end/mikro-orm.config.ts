import { defineConfig } from '@mikro-orm/postgresql';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  clientUrl: process.env.DATABASE_URL,
  entities: ['./src/entities'],
  entitiesTs: ['./src/entities'],
  migrations: {
    path: './src/migrations'
  },
  debug: process.env.NODE_ENV !== 'production',
}); 