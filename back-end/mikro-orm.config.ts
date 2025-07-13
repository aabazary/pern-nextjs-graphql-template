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
  debug: false,
  logger: (message) => {
    // Only log errors and warnings, not discovery info
    if (message.includes('error') || message.includes('warn')) {
      console.log(message);
    }
  },
}); 