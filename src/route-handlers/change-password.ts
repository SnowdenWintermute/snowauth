import { Request, Response, NextFunction } from "express";
import * as argon2 from "argon2";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { valkeyManager } from "../kv-store/client.js";
import { FAILED_LOGIN_ATTEMPTS_PREFIX, PASSWORD_RESET_SESSION_PREFIX } from "../kv-store/consts.js";
import { credentialsRepo } from "../database/repos/credentials.js";
import { ARGON2_OPTIONS } from "../config.js";
import getSession from "../tokens/get-session.js";
import { ChangePasswordUserInput } from "../validation/change-password-schema.js";
import catchUnhandledErrors from "../errors/catch-unhandled-errors.js";
import { profilesRepo } from "../database/repos/profiles.js";
import { USER_STATUS } from "../database/db-consts.js";

export default async function changePasswordHandler(
  req: Request<object, object, ChangePasswordUserInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { token, password } = req.body;

    const { session: existingSession, sessionName } = await getSession(
      PASSWORD_RESET_SESSION_PREFIX,
      token
    );

    if (existingSession === null)
      return next([new SnowAuthError(ERROR_MESSAGES.SESSION.INVALID_OR_EXPIRED_TOKEN, 401)]);

    const email = existingSession;

    const existingCredentials = await credentialsRepo.findOne("emailAddress", email);

    if (existingCredentials === undefined) {
      console.log(ERROR_MESSAGES.CREDENTIALS.MISSING);
      return next([new SnowAuthError(ERROR_MESSAGES.SERVER_GENERIC, 500)]);
    }

    const hashedPassword = await argon2.hash(password, ARGON2_OPTIONS);

    await credentialsRepo.updatePassword(existingCredentials.userId, hashedPassword);

    valkeyManager.context.del(sessionName);

    const failedLoginAttemptsKey = `${FAILED_LOGIN_ATTEMPTS_PREFIX}${existingCredentials.userId}`;
    await valkeyManager.context.del(failedLoginAttemptsKey);
    const profile = await profilesRepo.findOne("userId", existingCredentials.userId);
    if (profile === undefined)
      return next([new SnowAuthError(ERROR_MESSAGES.USER.MISSING_PROFILE, 500)]);
    profile.status = USER_STATUS.ACTIVE;
    await profilesRepo.update(profile);

    const credentials = await credentialsRepo.findOne("emailAddress", email);
    if (!credentials) {
      console.error("expected to find the user we just inserted or updated");
      return next([new SnowAuthError(ERROR_MESSAGES.SERVER_GENERIC, 500)]);
    }

    res.sendStatus(201);
  } catch (error) {
    return catchUnhandledErrors(error, next);
  }
}
