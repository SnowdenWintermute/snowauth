import { env } from "../utils/load-env-variables.js";

export const pgOptions = {
  host: env.POSTGRES_HOST,
  port: 5432,
  database: env.POSTGRES_DB,
  user: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
};

export const TEST_DB_NAME = "test-db";

export const pgOptionsTestDB = {
  host: "localhost",
  port: 5432,
  database: TEST_DB_NAME,
  user: "postgres",
  password: "postgres",
};
