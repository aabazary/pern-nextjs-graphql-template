import { Request, Response } from "express";
import { EntityManager } from "@mikro-orm/core";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface MyContext {
  req: Request;
  res: Response;
  user?: AuthUser;
  em: EntityManager;
} 