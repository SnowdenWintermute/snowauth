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

export default async function accountActivationHandler(
  req: Request<object, object, AccountActivationUserInput>,
  res: Response,
  next: NextFunction
) {
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

  const { email } = decoded;

  const accountActivationSession = await valkeyManager.client.get(
    `${ACCOUNT_CREATION_SESSION_PREFIX}${email}`
  );
  if (!accountActivationSession) {
    return next([
      new SnowAuthError(ERROR_MESSAGES.SESSION.USED_OR_EXPIRED_ACCOUNT_CREATION_SESSION, 401),
    ]);
  }

  const existingCredentials = await credentialsRepo.findOne("emailAddress", email);

  // check if their credentials already were created by another id provider
  // if not
  // - check if the email is already in use by another user
  // - create a new user, new profile and new credentials
  // else, add their password to the existing credentials
  // if they provided a new username
  // - check if the username is already taken
  // - update their profile with the username

  //try {
  //  await wrappedRedis.context!.del(`${ACCOUNT_CREATION_SESSION_PREFIX}${email}`);
  //  res.status(201).json({ user: new SanitizedUser(user) });
  //} catch (error: any) {
  //  if (error.schema && error.detail) {
  //    // probably a postgres error
  //    const errors = [];
  //    console.log("pg error: ", error.code, JSON.stringify(error, null, 2));
  //    // @todo - prettify errors and add to ERROR_MESSAGES object
  //    if (error.code === "23505" && error.constraint === "users_email_key")
  //      errors.push(new CustomError(ERROR_MESSAGES.AUTH.EMAIL_IN_USE_OR_UNAVAILABLE, 403));
  //    if (error.code === "23505" && error.constraint === "users_name_key")
  //      errors.push(new CustomError(ERROR_MESSAGES.AUTH.NAME_IN_USE_OR_UNAVAILABLE, 403));
  //    else if (error.column)
  //      errors.push(new CustomError(`Database error - problem relating to ${error.column}`, 400));
  //    else if (error.detail)
  //      errors.push(new CustomError(`Database error - detail: ${error.detail}`, 400));
  //    return next(errors);
  //  }
  //}
  return res.json({});
}
