import { Request, Response, NextFunction } from "express";
import * as argon2 from "argon2";
import { AccountActivationUserInput } from "../validation/account-activation-schema.js";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { valkeyManager } from "../kv-store/client.js";
import { ACCOUNT_CREATION_SESSION_PREFIX } from "../kv-store/consts.js";
import { credentialsRepo } from "../database/repos/credentials.js";
import { logUserIn } from "./log-user-in.js";
import { ARGON2_OPTIONS } from "../config.js";
import getSession from "../tokens/get-session.js";
import insertNewUser from "../database/utils/insert-new-user.js";
import { profilesRepo } from "../database/repos/profiles.js";
import catchUnhandledErrors from "../errors/catch-unhandled-errors.js";

export default async function accountActivationHandler(
  req: Request<object, object, AccountActivationUserInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { token, username, password } = req.body;

    const { session: existingSession, sessionName } = await getSession(
      ACCOUNT_CREATION_SESSION_PREFIX,
      token
    );

    if (existingSession === null)
      return next([new SnowAuthError(ERROR_MESSAGES.SESSION.INVALID_OR_EXPIRED_TOKEN, 401)]);

    const email = existingSession;

    const existingCredentials = await credentialsRepo.findOne("emailAddress", email);

    const hashedPassword = await argon2.hash(password, ARGON2_OPTIONS);

    if (existingCredentials === undefined) {
      const existingUsername = await profilesRepo.findOne("username", username, true);
      if (existingUsername !== undefined)
        return next([new SnowAuthError(ERROR_MESSAGES.USER.NAME_IN_USE_OR_UNAVAILABLE, 400)]);

      await insertNewUser(email, hashedPassword, username);
    } else {
      await credentialsRepo.updatePassword(existingCredentials.id, hashedPassword);
      // don't update their username here, if they already have an account from a
      // third party id provider we will get their initial username in a different
      // dedicated route handler
    }

    valkeyManager.context.del(sessionName);

    const credentials = await credentialsRepo.findOne("emailAddress", email);
    if (!credentials) {
      console.error("expected to find the user we just inserted or updated");
      return next([new SnowAuthError(ERROR_MESSAGES.SERVER_GENERIC, 500)]);
    }

    // log in
    await logUserIn(res, credentials.userId);

    // send this so the client can display the user info
    res.status(201).json({ email, username });
  } catch (error: any) {
    return catchUnhandledErrors(error, next);
  }
}
