import { Request, Response, NextFunction } from "express";
import * as argon2 from "argon2";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { valkeyManager } from "../kv-store/client.js";
import { PASSWORD_RESET_SESSION_PREFIX } from "../kv-store/consts.js";
import { credentialsRepo } from "../database/repos/credentials.js";
import { ARGON2_OPTIONS } from "../config.js";
import getSession from "../tokens/get-session.js";
import { ChangePasswordUserInput } from "../validation/change-password-schema.js";

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

    const credentials = await credentialsRepo.findOne("emailAddress", email);
    if (!credentials) {
      console.error("expected to find the user we just inserted or updated");
      return next([new SnowAuthError(ERROR_MESSAGES.SERVER_GENERIC, 500)]);
    }

    res.sendStatus(201);
  } catch (error: any) {
    const errors = [];
    if (error.schema && error.detail) {
      // probably a postgres error
      console.error("pg error: ", error.code, JSON.stringify(error, null, 2));
      if (error.column)
        errors.push(new SnowAuthError(`Database error - problem relating to ${error.column}`, 400));
      else if (error.detail)
        errors.push(new SnowAuthError(`Database error - detail: ${error.detail}`, 400));
    } else if (error instanceof SnowAuthError) {
      errors.push(error);
    } else if (error.message && error.status) {
      errors.push(new SnowAuthError(error.message, error.code));
    }
    return next(errors);
  }
}