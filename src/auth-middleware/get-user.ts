import { Request, Response, NextFunction } from "express";
import {
  REMEMBER_ME_COOKIE_NAME,
  REMEMBER_ME_SERIES_COOKIE_NAME,
  REMEMBER_ME_TOKEN_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "../config.js";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { valkeyManager } from "../kv-store/client.js";
import { hashToken } from "../tokens/hashing-utils.js";
import cloneDeep from "lodash.clonedeep";
import { isValidSnowAuthRandomHex } from "../validation/snowauth-random-hex.js";
import { sessionSeriesRepo } from "../database/repos/session-series.js";
import { profilesRepo } from "../database/repos/profiles.js";
import { USER_STATUS } from "../database/db-consts.js";
import { env } from "../utils/load-env-variables.js";
import { logUserIn } from "../route-handlers/log-user-in.js";
import { userIdsRepo } from "../database/repos/user-ids.js";
import getSession from "../tokens/get-session.js";
import { AUTH_SESSION_PREFIX } from "../kv-store/consts.js";

export default async function getUser(req: Request, res: Response, next: NextFunction) {
  console.log("COOKIES: ", req.cookies);
  const { SESSION, USER } = ERROR_MESSAGES;

  const sessionId = req.cookies[SESSION_COOKIE_NAME];
  const rememberMeCookie = req.cookies[REMEMBER_ME_COOKIE_NAME];
  console.log(sessionId, rememberMeCookie);

  if (sessionId !== undefined && !isValidSnowAuthRandomHex(sessionId)) {
    // @TODO - handle suspicous activity
    console.warn("SUSPICIOUS ACTIVITY - Malformed session id provided");
    return next([new SnowAuthError(SESSION.INVALID_OR_EXPIRED_TOKEN, 401)]);
  }

  let session: null | string;
  if (sessionId === undefined) session = null;
  else session = await getSession(AUTH_SESSION_PREFIX, sessionId);

  if (session === null) {
    if (rememberMeCookie === undefined) {
      const cookieOptions = cloneDeep(SESSION_COOKIE_OPTIONS);
      cookieOptions.maxAge = 0;
      res.cookie(SESSION_COOKIE_NAME, "", cookieOptions);
      return next([new SnowAuthError(SESSION.NOT_LOGGED_IN, 401)]);
    }

    const parsedCookie = JSON.parse(rememberMeCookie);
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
      console.warn("SUSPICIOUS ACTIVITY - Malformed remember me cookie provided");
      return next([new SnowAuthError(SESSION.INVALID_OR_EXPIRED_TOKEN, 401)]);
    }

    const sessionSeries = await sessionSeriesRepo.findOne("id", seriesId);
    if (sessionSeries === undefined)
      return next([new SnowAuthError(SESSION.INVALID_OR_EXPIRED_TOKEN, 401)]);

    if (sessionSeries.hashedToken !== hashToken(rememberMeToken)) {
      console.warn("SUSPICIOUS ACTIVITY - series session id and token mismatch");
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
      return next([new SnowAuthError(SESSION.INVALID_OR_EXPIRED_TOKEN, 401)]);
    }

    const userIdRecord = await userIdsRepo.findOne("id", sessionSeries.userId);
    if (userIdRecord === undefined) {
      console.warn(
        "A remember me token was used which was associated with a user that no longer exists"
      );
      return next([new SnowAuthError(USER.DOES_NOT_EXIST, 404)]);
    }

    logUserIn(res, sessionSeries.userId, {
      shouldRemember: true,
      existingSessionSeriesId: sessionSeries.id,
    });

    res.locals.userId = sessionSeries.userId;
  } else {
    res.locals.userId = session;
  }

  next();
}
