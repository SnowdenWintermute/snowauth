import * as dotenv from "dotenv";
dotenv.config();

export const pgOptions = {
  host: process.env.POSTGRES_HOST,
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};

export const TEST_DB_NAME = "test-db";

export const pgOptionsTestDB = {
  host: "localhost",
  port: 5432,
  database: TEST_DB_NAME,
  user: "postgres",
  password: "postgres",
};
