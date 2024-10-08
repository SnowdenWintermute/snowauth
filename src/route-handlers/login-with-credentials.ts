import { Request, Response, NextFunction } from "express";
import * as argon2 from "argon2";
import { credentialsRepo } from "../database/repos/credentials.js";
import { LoginUserInput } from "../validation/login-schema.js";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { valkeyManager } from "../kv-store/client.js";
import { FAILED_LOGIN_ATTEMPTS_PREFIX } from "../kv-store/consts.js";
import { FAILED_LOGIN_COUNTER_EXPIRATION, FAILED_LOGIN_COUNTER_TOLERANCE } from "../config.js";
import { profilesRepo } from "../database/repos/profiles.js";
import { USER_STATUS } from "../database/db-consts.js";
import { env } from "../utils/load-env-variables.js";
import { logUserIn } from "./log-user-in.js";
import catchUnhandledErrors from "../errors/catch-unhandled-errors.js";

export default async function loginWithCredentialsHandler(
  req: Request<object, object, LoginUserInput>,
  res: Response,
  next: NextFunction
) {
  try {
    // find the credentials for this email address
    const { email, password, rememberMe } = req.body;
    const credentials = await credentialsRepo.findOne("emailAddress", email);
    if (!credentials || !credentials.password)
      return next([new SnowAuthError(ERROR_MESSAGES.CREDENTIALS.INVALID, 401)]);

    const isValid = await argon2.verify(credentials.password, password, {
      secret: Buffer.from(env.HASHING_PEPPER),
    });

    const profile = await profilesRepo.findOne("userId", credentials.userId);
    if (!profile) {
      console.error(ERROR_MESSAGES.USER.MISSING_PROFLIE);
      return next([new SnowAuthError(ERROR_MESSAGES.SERVER_GENERIC, 500)]);
    }

    if (!isValid) {
      const failedLoginAttemptsKey = `${FAILED_LOGIN_ATTEMPTS_PREFIX}${credentials.userId}`;
      const failedAttempts = await valkeyManager.context.incrBy(failedLoginAttemptsKey, 1);
      await valkeyManager.context.expire(failedLoginAttemptsKey, FAILED_LOGIN_COUNTER_EXPIRATION);
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

    if (profile.status === USER_STATUS.LOCKED_OUT) {
      return next([new SnowAuthError(ERROR_MESSAGES.USER.ACCOUNT_LOCKED, 401)]);
    }

    if (profile.status === USER_STATUS.BANNED) {
      if (profile.banExpiresAt && Date.now() > new Date(profile.banExpiresAt).getTime())
        await profilesRepo.update({ ...profile, status: USER_STATUS.ACTIVE, banExpiresAt: null });
      else return next([new SnowAuthError(ERROR_MESSAGES.USER.ACCOUNT_BANNED, 401)]);
    }

    await logUserIn(res, credentials.userId, {
      shouldRemember: rememberMe,
      existingSessionSeriesId: null,
    });

    res.status(201).json({ username: profile.username });
  } catch (err) {
    return catchUnhandledErrors(err, next);
  }
}
