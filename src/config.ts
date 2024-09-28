import { CookieOptions } from "express";
import { ONE_MINUTE } from "./consts.js";
import { env } from "./utils/load-env-variables.js";

export const INCOMING_JSON_DATA_LIMIT = "10kb";
export const FAILED_LOGIN_COUNTER_EXPIRATION = 10 * ONE_MINUTE;
export const FAILED_LOGIN_COUNTER_TOLERANCE = 5;

export const ACCESS_TOKEN_COOKIE_NAME = "snowauth_access-token";

const accessTokenExpiresIn = env.ACCESS_TOKEN_EXPIRATION;

export const ACCESS_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  maxAge: accessTokenExpiresIn,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
};
