import { NextFunction, Request, Response } from "express";
import { UserRegistrationUserInput } from "../validation/register-user-schema.js";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import CredentialsRepo from "../database/repos/credentials.js";
import { signJwtSymmetric } from "../tokens/index.js";
import getEnvVariable from "../utils/get-env-variable.js";
import { valkeyManager } from "../kv-store/client.js";
import { ACCOUNT_CREATION_SESSION_PREFIX } from "../kv-store/consts.js";

export default async function accountCreationRequestHandler(
  req: Request<object, object, UserRegistrationUserInput>,
  res: Response,
  next: NextFunction
) {
  const { email } = req.body;
  const existingCredentials = await CredentialsRepo.findOne("emailAddress", email);

  // const existingUsername
  const usernameOption = null;

  if (existingCredentials && existingCredentials.password !== null) {
    return next([new SnowAuthError(ERROR_MESSAGES.CREDENTIALS.EMAIL_IN_USE_OR_UNAVAILABLE, 403)]);
  }

  const accountActivationPrivateKey = getEnvVariable("ACCOUNT_ACTIVATION_TOKEN_PRIVATE_KEY");
  const accountActivationSessionExpirationTime = getEnvVariable(
    "ACCOUNT_ACTIVATION_SESSION_EXPIRATION_TIME"
  );
  if (
    accountActivationPrivateKey instanceof Error ||
    accountActivationSessionExpirationTime instanceof Error
  )
    return next([new SnowAuthError(ERROR_MESSAGES.SERVER_GENERIC, 500)]);

  const accountActivationToken = signJwtSymmetric(
    { email, usernameOption }, // if they have no username the requesting service's frontend can ask them for one
    accountActivationPrivateKey,
    {
      expiresIn: accountActivationSessionExpirationTime,
    }
  );

  valkeyManager.client.set(`${ACCOUNT_CREATION_SESSION_PREFIX}${email}`, email, {
    EX: parseInt(accountActivationSessionExpirationTime, 10),
  });

  res.status(200).json({ accountActivationToken });
}
