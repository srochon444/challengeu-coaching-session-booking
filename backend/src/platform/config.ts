export const config = {
  port: Number(process.env.PORT ?? 3001),
  jwtSecret: process.env.JWT_SECRET ?? "dev-insecure-secret",
  dbPath: process.env.DB_PATH ?? "backend/data/dev.sqlite",
};
