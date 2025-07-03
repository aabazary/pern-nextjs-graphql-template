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
import { MyContext, AuthUser } from "./types";

import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import configurePassport from "./config/passport";
import authRouter from "./routes/auth";
import prisma from "./prisma/db";

configurePassport();

const app = express();
const httpServer = http.createServer(app);

// Global Middleware
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());

app.use((req: Request, res: Response, next: NextFunction) => {
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
});

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
  await server.start();

  // GraphQL endpoint
  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req, res }): Promise<MyContext> => ({
        req: req,
        res: res,
        user: (req as any).user as AuthUser | undefined,
      }),
    })
  );

  // Health check for backend
  app.get("/health", (req, res) => {
    res.status(200).send("Backend is healthy!");
  });

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}`);
    console.log(`🚀 GraphQL server ready at http://localhost:${PORT}/graphql`);
  });
}

// Database connection and server start
prisma
  .$connect()
  .then(() => {
    console.log("🎉 Connected to PostgreSQL database!");
    startServer();
  })
  .catch((err: unknown) => {
    if (err instanceof Error) {
      console.error("❌ Database connection failed:", err.message);
    } else {
      console.error("❌ Database connection failed:", err);
    }
    process.exit(1);
  });
