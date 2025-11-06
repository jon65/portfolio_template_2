import { defineConfig, env } from "prisma/config";
import { config } from "dotenv";

// Load environment variables from .env.local (Next.js convention) BEFORE Prisma reads them
// This ensures DATABASE_URL is available for schema validation
config({ path: ".env.local" });
config({ path: ".env" });

// Get DATABASE_URL after loading env files
// For db pull/push, DATABASE_URL must be set in .env.local
// For generate, we provide a fallback placeholder
const databaseUrl = process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: databaseUrl,
  },
});
