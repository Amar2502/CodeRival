import { config } from "./config"
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = `${config.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

export { db };