import { defineConfig } from "prisma/config";
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in .env file!");
}

export default defineConfig({
  schema: "./prisma", // або "prisma/schema" якщо multi-file
  datasource: {
    url: process.env.DATABASE_URL!,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
