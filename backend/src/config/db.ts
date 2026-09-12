import { config } from "./config"
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import crypto from "crypto";

const adapter = new PrismaPg(
  {
    connectionString: config.DATABASE_URL,
    max: 10,                        // max connections in pool
    min: 2,                         // keep 2 idle connections warm
    idleTimeoutMillis: 30_000,      // close idle connections after 30s
    connectionTimeoutMillis: 5_000, // fail fast if can't connect in 5s
  },
  {
    // Cache prepared statements — repeated queries skip the parse step in PostgreSQL
    statementNameGenerator: (query) => {
      return `ps_${crypto.createHash("md5").update(query.sql).digest("hex").slice(0, 16)}`;
    },
  }
);

const db = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export { db };