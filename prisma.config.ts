import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma", // або "prisma/schema" якщо multi-file
  datasource: {
    url: process.env.DATABASE_URL!,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
