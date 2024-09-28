import { Request, Response, NextFunction, CookieOptions } from "express";
import * as argon2 from "argon2";
import { Credentials, credentialsRepo } from "../database/repos/credentials.js";
import { LoginUserInput } from "../validation/login-schema.js";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { valkeyManager } from "../kv-store/client.js";
import { FAILED_LOGIN_ATTEMPTS_PREFIX } from "../kv-store/consts.js";
import {
  FAILED_LOGIN_COUNTER_EXPIRATION,
  FAILED_LOGIN_COUNTER_TOLERANCE,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "../config.js";
import { profilesRepo } from "../database/repos/profiles.js";
import { USER_STATUS } from "../database/db-consts.js";
import { env } from "../utils/load-env-variables.js";
import createSession from "../tokens/create-session.js";

export default async function loginHandler(
  req: Request<object, object, LoginUserInput>,
  res: Response,
  next: NextFunction
) {
  // find the credentials for this email address
  const { email, password, rememberMe } = req.body;
  const credentials = await credentialsRepo.findOne("emailAddress", email);
  if (!credentials || !credentials.password)
    return next([new SnowAuthError(ERROR_MESSAGES.CREDENTIALS.INVALID, 401)]);

  const isValid = await argon2.verify(credentials.password, password, {
    secret: Buffer.from(env.HASHING_PEPPER),
  });

  const profile = await profilesRepo.findOne("userId", credentials.userId);
  if (!profile) return next([new SnowAuthError(ERROR_MESSAGES.CREDENTIALS.INVALID, 401)]);

  if (!isValid) {
    const failedLoginAttemptsKey = `${FAILED_LOGIN_ATTEMPTS_PREFIX}${credentials.userId}`;
    const failedAttempts = await valkeyManager.context.client.incrBy(failedLoginAttemptsKey, 1);
    await valkeyManager.context.client.expire(
      failedLoginAttemptsKey,
      FAILED_LOGIN_COUNTER_EXPIRATION
    );
    if (failedAttempts < FAILED_LOGIN_COUNTER_TOLERANCE) {
      const remainingAttempts = FAILED_LOGIN_COUNTER_TOLERANCE - failedAttempts;
      const error = new SnowAuthError(
        ERROR_MESSAGES.CREDENTIALS.INVALID_WITH_ATTEMPTS_REMAINING(remainingAttempts),
        401
      );
      return next([error]);
    }

    profile.status = USER_STATUS.LOCKED_OUT;
    await profilesRepo.update(profile);
    return next([new SnowAuthError(ERROR_MESSAGES.RATE_LIMITER.TOO_MANY_FAILED_LOGINS, 401)]);
  }

  if (profile.status === USER_STATUS.BANNED) {
    if (profile.banExpiresAt && Date.now() > new Date(profile.banExpiresAt).getTime())
      await profilesRepo.update({ ...profile, status: USER_STATUS.ACTIVE, banExpiresAt: null });
    else return next([new SnowAuthError(ERROR_MESSAGES.USER.ACCOUNT_BANNED, 401)]);
  }

  await logUserIn(res, credentials, rememberMe);

  res.sendStatus(200);
}

export async function logUserIn(res: Response, credentials: Credentials, shouldRemember: boolean) {
  const sessionId = await createSession(credentials.userId);
  res.cookie(SESSION_COOKIE_NAME, sessionId, SESSION_COOKIE_OPTIONS);
  if (!shouldRemember) return;

  // create remember me token
  // - upon login create a "remember me" cookie which the client is allowed to keep
  //   (set max age long time) and is associated with their ip and "device fingerprints"(?)
  // - the token should include a "token" and "series id" and be saved associated with the user
  // - hash the "remember me" token when storing it
  // - when users log in with the "remember me" token, refresh it and overwrite the old one but keep
  //   the series id
  // - expire the series id after a long time
  // - logging out should invalidate the "remember me" token
}
