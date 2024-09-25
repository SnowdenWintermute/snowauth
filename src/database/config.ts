import * as dotenv from "dotenv";
dotenv.config();

export const pgOptions = {
  host: process.env.POSTGRES_HOST_DEV,
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};

export const pgOptionsTestDB = {
  host: "localhost",
  port: 5432,
  database: "test-db",
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};
