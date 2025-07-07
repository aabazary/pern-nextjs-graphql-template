import { EntityManager } from '@mikro-orm/core';

declare module 'express-serve-static-core' {
  interface Request {
    em: EntityManager;
  }
}

export {}; 