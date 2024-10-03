import { CookieOptions } from "express";
import { ONE_MINUTE } from "./consts.js";
import { env } from "./utils/load-env-variables.js";
import * as argon2 from "argon2";

export const INCOMING_JSON_DATA_LIMIT = "10kb";
export const FAILED_LOGIN_COUNTER_EXPIRATION = 10 * ONE_MINUTE;
export const FAILED_LOGIN_COUNTER_TOLERANCE = 5;

export const SESSION_COOKIE_NAME = "id";
export const REMEMBER_ME_COOKIE_NAME = "rm";
export const REMEMBER_ME_SERIES_COOKIE_NAME = "series";
export const REMEMBER_ME_TOKEN_COOKIE_NAME = "rmid";
export const OAUTH_STATE_COOKIE_NAME = "state";

export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? "strict" : "none",
};

export const REMEMBER_ME_COOKIE_OPTIONS: CookieOptions = {
  maxAge: env.REMEMBER_ME_TOKEN_EXPIRATION,
  ...SESSION_COOKIE_OPTIONS,
};

export const OAUTH_STATE_COOKIE_OPTIONS: CookieOptions = {
  maxAge: env.OAUTH_STATE_COOKIE_EXPIRATION,
  ...SESSION_COOKIE_OPTIONS,
};

export const ARGON2_OPTIONS = {
  hashLength: 32,
  type: argon2.argon2id,
  secret: Buffer.from(env.HASHING_PEPPER),
};
