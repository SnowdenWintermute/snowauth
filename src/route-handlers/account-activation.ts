import { Request, Response, NextFunction } from "express";
import * as argon2 from "argon2";
import { AccountActivationUserInput } from "../validation/account-activation-schema.js";
import { verifyJwtSymmetric } from "../tokens/index.js";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { AccountActivationTokenPayload } from "./account-creation.js";
import { valkeyManager } from "../kv-store/client.js";
import { ACCOUNT_CREATION_SESSION_PREFIX } from "../kv-store/consts.js";
import { userIdsRepo } from "../database/repos/user_ids.js";
import { credentialsRepo } from "../database/repos/credentials.js";
import { profilesRepo } from "../database/repos/profiles.js";
import { env } from "../utils/load-env-variables.js";

export default async function accountActivationHandler(
  req: Request<object, object, AccountActivationUserInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { token, username, password } = req.body;

    const decoded = verifyJwtSymmetric<AccountActivationTokenPayload>(
      token,
      env.ACCOUNT_ACTIVATION_TOKEN_PRIVATE_KEY
    );
    if (!decoded)
      return next([new SnowAuthError(ERROR_MESSAGES.SESSION.INVALID_OR_EXPIRED_TOKEN, 401)]);

    const { email, tokenCreatedAt } = decoded;

    // the value of the session should be the time the token was created so that
    // tokens match their corresponding sessions
    const sessionName = `${ACCOUNT_CREATION_SESSION_PREFIX}${email}`;
    const accountActivationSession = await valkeyManager.client.get(sessionName);
    if (!accountActivationSession || parseInt(accountActivationSession) !== tokenCreatedAt) {
      return next([
        new SnowAuthError(ERROR_MESSAGES.SESSION.USED_OR_EXPIRED_ACCOUNT_CREATION_SESSION, 401),
      ]);
    }

    const existingCredentials = await credentialsRepo.findOne("emailAddress", email);

    let hashedPasswordOption: null | string = null;

    if (password !== null)
      hashedPasswordOption = await argon2.hash(password, {
        hashLength: 32,
        type: argon2.argon2id,
        secret: Buffer.from(env.HASHING_PEPPER),
      });

    if (existingCredentials === undefined) {
      const newUserIdRecord = await userIdsRepo.insert();
      await credentialsRepo.insert(newUserIdRecord.id, email, hashedPasswordOption);
      await profilesRepo.insert(newUserIdRecord.id, username);
    } else {
      await credentialsRepo.updatePassword(existingCredentials.id, hashedPasswordOption);
      const profileOption = await profilesRepo.findOne("userId", existingCredentials.userId);
      if (profileOption === undefined) throw new Error(ERROR_MESSAGES.USER.MISSING_PROFLIE);
      profileOption.username = username;
      profileOption.usernameUpdatedAt = Date.now();
      await profilesRepo.update(profileOption);
    }

    valkeyManager.client.del(sessionName);

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
