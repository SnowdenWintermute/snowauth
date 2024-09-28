import { CookieOptions } from "express";
import { ONE_MINUTE } from "./consts.js";
import { env } from "./utils/load-env-variables.js";

export const INCOMING_JSON_DATA_LIMIT = "10kb";
export const FAILED_LOGIN_COUNTER_EXPIRATION = 10 * ONE_MINUTE;
export const FAILED_LOGIN_COUNTER_TOLERANCE = 5;

export const SESSION_COOKIE_NAME = "id";
export const REMEMBER_ME_COOKIE_NAME = "series";

const accessTokenExpiresIn = env.SESSION_EXPIRATION;

export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
};

export const REMEMBER_ME_COOKIE_OPTIONS: CookieOptions = {
  maxAge: accessTokenExpiresIn,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
};
