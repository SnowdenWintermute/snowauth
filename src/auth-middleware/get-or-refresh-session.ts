import { Request, Response, NextFunction } from "express";
import {
  REMEMBER_ME_COOKIE_NAME,
  REMEMBER_ME_SERIES_COOKIE_NAME,
  REMEMBER_ME_TOKEN_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "../config.js";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { hashToken } from "../tokens/hashing-utils.js";
import { isValidSnowAuthRandomHex } from "../validation/snowauth-random-hex.js";
import { sessionSeriesRepo } from "../database/repos/session-series.js";
import { profilesRepo } from "../database/repos/profiles.js";
import { USER_STATUS } from "../database/db-consts.js";
import { env } from "../utils/load-env-variables.js";
import { logUserIn } from "../route-handlers/log-user-in.js";
import { userIdsRepo } from "../database/repos/user-ids.js";
import getSession from "../tokens/get-session.js";
import { AUTH_SESSION_PREFIX } from "../kv-store/consts.js";
import handleSuspiciousActivity from "../utils/handle-suspicious-activity.js";
import { clearCookie } from "../utils/clear-cookie.js";

export default async function getOrRefreshSession(req: Request, res: Response, next: NextFunction) {
  const { SESSION, USER } = ERROR_MESSAGES;

  const sessionId = req.cookies[SESSION_COOKIE_NAME];
  const rememberMeCookie = req.cookies[REMEMBER_ME_COOKIE_NAME];

  if (sessionId !== undefined && !isValidSnowAuthRandomHex(sessionId)) {
    handleSuspiciousActivity("SUSPICIOUS ACTIVITY - Malformed session id provided");
    return next([new SnowAuthError(SESSION.INVALID_OR_EXPIRED_TOKEN, 401)]);
  }

  const session = await getSession(AUTH_SESSION_PREFIX, sessionId || "");

  if (session !== null) {
    res.locals.userId = parseInt(session);
    return next();
  }

  if (rememberMeCookie === undefined) {
    clearCookie(res, SESSION_COOKIE_NAME);
    return next([new SnowAuthError(SESSION.NOT_LOGGED_IN, 401)]);
  }

  const validRememberMeCookie = validateRememberMeCookie(rememberMeCookie);
  if (validRememberMeCookie === null) {
    handleSuspiciousActivity("SUSPICIOUS ACTIVITY - Malformed remember me cookie provided");
    return next([new SnowAuthError(SESSION.INVALID_OR_EXPIRED_TOKEN, 401)]);
  }
  const { seriesId, rememberMeToken } = validRememberMeCookie;

  const sessionSeries = await sessionSeriesRepo.findById(seriesId);
  if (sessionSeries === undefined) return next([new SnowAuthError(SESSION.NOT_LOGGED_IN, 401)]);

  if (sessionSeries.hashedToken !== hashToken(rememberMeToken)) {
    handleSuspiciousActivity("SUSPICIOUS ACTIVITY - series session id and token mismatch");
    const profile = await profilesRepo.findOne("userId", sessionSeries.userId);
    if (profile) {
      profile.status = USER_STATUS.LOCKED_OUT;
      await profilesRepo.update(profile);
    }
    return next([new SnowAuthError(USER.ACCOUNT_LOCKED, 401)]);
  }

  const sessionSeriesIsExpired =
    Date.now() - +sessionSeries.createdAt >= env.REMEMBER_ME_TOKEN_EXPIRATION;

  if (sessionSeriesIsExpired) {
    sessionSeriesRepo.delete(sessionSeries.id);
    return next([new SnowAuthError(SESSION.NOT_LOGGED_IN, 401)]);
  }

  const userIdRecord = await userIdsRepo.findOne("id", sessionSeries.userId);
  if (userIdRecord === undefined) {
    handleSuspiciousActivity(
      "A remember me token was used which was associated with a user that no longer exists"
    );
    return next([new SnowAuthError(USER.DOES_NOT_EXIST, 404)]);
  }

  logUserIn(res, sessionSeries.userId, {
    shouldRemember: true,
    existingSessionSeriesId: sessionSeries.id,
  });

  res.locals.userId = sessionSeries.userId;
  next();
}

export function validateRememberMeCookie(cookie: string) {
  const parsedCookie = JSON.parse(cookie);
  const seriesId = parsedCookie[REMEMBER_ME_SERIES_COOKIE_NAME];
  const rememberMeToken = parsedCookie[REMEMBER_ME_TOKEN_COOKIE_NAME];
  const seriesIdIsValid = isValidSnowAuthRandomHex(seriesId);
  const rememberMeTokenIsValid = isValidSnowAuthRandomHex(rememberMeToken);
  if (
    !seriesIdIsValid ||
    !rememberMeTokenIsValid ||
    typeof seriesId !== "string" ||
    typeof rememberMeToken !== "string"
  ) {
    return null;
  }

  return { seriesId, rememberMeToken };
}
