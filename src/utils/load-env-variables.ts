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
  ACCESS_TOKEN_PRIVATE_KEY: str(),
  ACCESS_TOKEN_EXPIRATION: num(),
  AUTH_SESSION_EXPIRATION: num(),
  PASSWORD_RESET_TOKEN_EXPIRATION: num(),
  HASHING_PEPPER: str(),
  SENDGRID_API_KEY: str(),
  SENDGRID_EMAIL_ADDRESS: email(),
});
