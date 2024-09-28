import { Request, Response, NextFunction, CookieOptions } from "express";
import * as argon2 from "argon2";
import { credentialsRepo } from "../database/repos/credentials.js";
import { LoginUserInput } from "../validation/login-schema.js";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { valkeyManager } from "../kv-store/client.js";
import { FAILED_LOGIN_ATTEMPTS_PREFIX } from "../kv-store/consts.js";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  ACCESS_TOKEN_COOKIE_OPTIONS,
  FAILED_LOGIN_COUNTER_EXPIRATION,
  FAILED_LOGIN_COUNTER_TOLERANCE,
} from "../config.js";
import { profilesRepo } from "../database/repos/profiles.js";
import { USER_STATUS } from "../database/db-consts.js";
import signTokenAndCreateSession from "../utils/sign-token-and-create-session.js";
import { env } from "../utils/load-env-variables.js";

export default async function loginHandler(
  req: Request<object, object, LoginUserInput>,
  res: Response,
  next: NextFunction
) {
  // find the credentials for this email address
  const { email, password } = req.body;
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

  const accessToken = await signTokenAndCreateSession(email, credentials.userId);
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);

  res.sendStatus(200);
}
