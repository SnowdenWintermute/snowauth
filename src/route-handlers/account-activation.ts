import { Request, Response, NextFunction } from "express";
import { AccountActivationUserInput } from "../validation/account-activation-schema.js";
import { verifyJwtSymmetric } from "../tokens/index.js";
import getEnvVariable from "../utils/get-env-variable.js";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { AccountActivationTokenPayload } from "./account-creation.js";
import { valkeyManager } from "../kv-store/client.js";
import { ACCOUNT_CREATION_SESSION_PREFIX } from "../kv-store/consts.js";
import { userIdsRepo } from "../database/repos/user_ids.js";
import { credentialsRepo } from "../database/repos/credentials.js";
import { profilesRepo } from "../database/repos/profiles.js";

export default async function accountActivationHandler(
  req: Request<object, object, AccountActivationUserInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { token, username, password } = req.body;

    const accountActivationPrivateKey = getEnvVariable("ACCOUNT_ACTIVATION_TOKEN_PRIVATE_KEY");
    if (accountActivationPrivateKey instanceof Error)
      return next([new SnowAuthError(ERROR_MESSAGES.SERVER_GENERIC, 500)]);

    const decoded = verifyJwtSymmetric<AccountActivationTokenPayload>(
      token,
      accountActivationPrivateKey
    );
    if (!decoded)
      return next([new SnowAuthError(ERROR_MESSAGES.SESSION.INVALID_OR_EXPIRED_TOKEN, 401)]);

    const { email, tokenCreatedAt } = decoded;

    // the value of the session should be the time the token was created so that
    // tokens match their corresponding sessions
    const accountActivationSession = await valkeyManager.client.get(
      `${ACCOUNT_CREATION_SESSION_PREFIX}${email}`
    );
    if (!accountActivationSession || parseInt(accountActivationSession) !== tokenCreatedAt) {
      return next([
        new SnowAuthError(ERROR_MESSAGES.SESSION.USED_OR_EXPIRED_ACCOUNT_CREATION_SESSION, 401),
      ]);
    }

    const existingCredentials = await credentialsRepo.findOne("emailAddress", email);

    if (existingCredentials === undefined) {
      const newUserIdRecord = await userIdsRepo.insert();
      await credentialsRepo.insert(newUserIdRecord.id, email, password);
      await profilesRepo.insert(newUserIdRecord.id, username);
    } else {
      await credentialsRepo.updatePassword(existingCredentials.id, password);
      const profileOption = await profilesRepo.findOne("userId", existingCredentials.userId);
      if (profileOption === undefined) throw new Error(ERROR_MESSAGES.USER.MISSING_PROFLIE);
      profileOption.username = username;
      profileOption.usernameUpdatedAt = Date.now();
      await profilesRepo.update(profileOption);
    }

    res.sendStatus(201);
  } catch (error: any) {
    const errors = [];
    if (error.schema && error.detail) {
      // probably a postgres error
      console.log("pg error: ", error.code, JSON.stringify(error, null, 2));
      // @todo - prettify errors and add to ERROR_MESSAGES object
      if (error.code === "23505" && error.constraint === "users_email_key")
        errors.push(new SnowAuthError(ERROR_MESSAGES.CREDENTIALS.EMAIL_IN_USE_OR_UNAVAILABLE, 403));
      if (error.code === "23505" && error.constraint === "users_name_key")
        errors.push(new SnowAuthError(ERROR_MESSAGES.USER.NAME_IN_USE_OR_UNAVAILABLE, 403));
      else if (error.column)
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
