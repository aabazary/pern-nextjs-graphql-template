/// <reference path="./express.d.ts" />
import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5"
import cors from "cors";
import corsOptions from "./config/cors";
import http from "http";
import passport from "passport";
import cookieParser from "cookie-parser";

import typeDefs from "./graphql/schema";
import resolvers from "./graphql/resolvers";
import type { MyContext, AuthUser } from "./types/context";

import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import configurePassport from "./config/passport";
import authRouter from "./routes/auth";

import { MikroORM, EntityManager } from '@mikro-orm/core';
import mikroOrmConfig from '../mikro-orm.config';

declare module 'express-serve-static-core' {
  interface Request {
    em: EntityManager;
  }
}

const app = express();
const httpServer = http.createServer(app);

// Global Middleware
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());

  // REST API Routes
  app.use("/api", authRouter);

  // Apollo Server Setup
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const server = new ApolloServer({
  schema,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

async function startServer() {
  // Initialize MikroORM
  const orm = await MikroORM.init(mikroOrmConfig);
  const em = orm.em.fork();

  // Configure Passport
  await configurePassport();

  // Add MikroORM EntityManager to each request BEFORE routes
  app.use((req, res, next) => {
    req.em = em.fork();
    next();
  });

  await server.start();

  // GraphQL endpoint with authentication
  app.use(
    "/graphql",
    (req, res, next) => {
      passport.authenticate(
        "jwt",
        { session: false },
        (err: any, user: AuthUser | false, info: any) => {
          if (err) {
            console.error("Passport JWT authentication error:", err);
            return next(err);
          }
          if (user) {
            (req as any).user = user;
          }
          next();
        }
      )(req, res, next);
    },
    expressMiddleware(server, {
      context: async ({ req, res }): Promise<MyContext> => ({
        req: req,
        res: res,
        user: (req as any).user as AuthUser | undefined,
        em: em.fork(), // Provide a forked EntityManager per request
      }),
    })
  );

  // Health check for backend
  app.get("/health", async (req, res) => {
    try {
      // Check database connectivity
      await em.getConnection().execute('SELECT 1');
      res.status(200).json({
        status: "healthy",
        message: "Backend and database are healthy!",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(503).json({
        status: "unhealthy",
        message: "Database connection failed",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Add a global error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Global error handler:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}`);
    console.log(`🚀 GraphQL server ready at http://localhost:${PORT}/graphql`);
  });
}

startServer().catch((err) => {
  console.error("❌ Server failed to start:", err);
  process.exit(1);
});
