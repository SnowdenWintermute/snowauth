import * as dotenv from "dotenv";
dotenv.config();

import { cleanEnv, str, email, num } from "envalid";

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ["development", "production", "test"] }),
  POSTGRES_HOST: str(),
  POSTGRES_DB: str(),
  POSTGRES_USER: str(),
  POSTGRES_PASSWORD: str(),
  DATABASE_URL: str(),
  VALKEY_URL: str(),
  ACCOUNT_ACTIVATION_TOKEN_PRIVATE_KEY: str(),
  ACCOUNT_ACTIVATION_SESSION_EXPIRATION: num(),
  PASSWORD_RESET_SESSION_EXPIRATION: num(),
  SESSION_EXPIRATION: num(),
  REMEMBER_ME_TOKEN_EXPIRATION: num(),
  OAUTH_STATE_COOKIE_EXPIRATION: num(),
  HASHING_PEPPER: str(),
  SESSION_HASH_KEY: str(),
  SENDGRID_API_KEY: str(),
  SENDGRID_EMAIL_ADDRESS: email(),
  GOOGLE_OAUTH_CLIENT_ID: str(),
  GOOGLE_OAUTH_CLIENT_SECRET: str(),
});
