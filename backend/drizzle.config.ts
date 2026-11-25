import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/platform/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url: "backend/data/dev.sqlite" },
});
