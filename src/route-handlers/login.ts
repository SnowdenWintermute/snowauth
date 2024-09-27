import { Request, Response, NextFunction, CookieOptions } from "express";
import * as argon2 from "argon2";
import { credentialsRepo } from "../database/repos/credentials.js";
import { LoginUserInput } from "../validation/login-schema.js";
import getEnvVariable from "../utils/get-env-variable.js";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { valkeyManager } from "../kv-store/client.js";
import { FAILED_LOGIN_ATTEMPTS_PREFIX } from "../kv-store/consts.js";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  FAILED_LOGIN_COUNTER_EXPIRATION,
  FAILED_LOGIN_COUNTER_TOLERANCE,
} from "../config.js";
import { profilesRepo } from "../database/repos/profiles.js";
import { USER_STATUS } from "../database/db-consts.js";
import signTokenAndCreateSession from "../utils/sign-token-and-create-session.js";

export default async function loginHandler(
  req: Request<object, object, LoginUserInput>,
  res: Response,
  next: NextFunction
) {
  const accessTokenExpiresInString = getEnvVariable("ACCESS_TOKEN_EXPIRES_IN");
  if (accessTokenExpiresInString instanceof Error)
    return next([new SnowAuthError(ERROR_MESSAGES.SERVER_GENERIC, 500)]);
  const accessTokenExpiresIn = parseInt(accessTokenExpiresInString, 10);

  const accessTokenCookieOptions: CookieOptions = {
    expires: new Date(Date.now() + accessTokenExpiresIn),
    maxAge: accessTokenExpiresIn,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  // find the credentials for this email address
  const { email, password } = req.body;
  const credentials = await credentialsRepo.findOne("emailAddress", email);
  if (!credentials || !credentials.password)
    return next([new SnowAuthError(ERROR_MESSAGES.CREDENTIALS.INVALID, 401)]);

  const pepper = getEnvVariable("HASHING_PEPPER");
  if (pepper instanceof Error) return next([new SnowAuthError(ERROR_MESSAGES.SERVER_GENERIC, 500)]);
  const isValid = await argon2.verify(credentials.password, password, {
    secret: Buffer.from(pepper),
  });

  const profile = await profilesRepo.findOne("userId", credentials.userId);
  if (!profile) return next([new SnowAuthError(ERROR_MESSAGES.CREDENTIALS.INVALID, 401)]);

  if (!isValid) {
    const failedLoginAttemptsKey = `${FAILED_LOGIN_ATTEMPTS_PREFIX}${credentials.userId}`;
    const failedAttempts = await valkeyManager.client.incrBy(failedLoginAttemptsKey, 1);
    await valkeyManager.client.expire(failedLoginAttemptsKey, FAILED_LOGIN_COUNTER_EXPIRATION);
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

  const accessTokenResult = await signTokenAndCreateSession(email, credentials.userId);
  if (accessTokenResult instanceof Error)
    return next([new SnowAuthError(ERROR_MESSAGES.SERVER_GENERIC, 500)]);

  res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessTokenResult, accessTokenCookieOptions);

  res.sendStatus(200);
}
