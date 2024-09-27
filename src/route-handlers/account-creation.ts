import { NextFunction, Request, Response } from "express";
import { UserRegistrationUserInput } from "../validation/register-user-schema.js";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { signJwtSymmetric } from "../tokens/index.js";
import getEnvVariable from "../utils/get-env-variable.js";
import { valkeyManager } from "../kv-store/client.js";
import { ACCOUNT_CREATION_SESSION_PREFIX } from "../kv-store/consts.js";
import { credentialsRepo } from "../database/repos/credentials.js";
import { profilesRepo } from "../database/repos/profiles.js";

export type AccountActivationTokenPayload = {
  tokenCreatedAt: number;
  email: string;
  existingUsernameOption: null | string;
};

export default async function accountCreationRequestHandler(
  req: Request<object, object, UserRegistrationUserInput>,
  res: Response,
  next: NextFunction
) {
  const { email } = req.body;
  const existingCredentials = await credentialsRepo.findOne("emailAddress", email);

  if (existingCredentials && existingCredentials.password !== null) {
    return next([new SnowAuthError(ERROR_MESSAGES.CREDENTIALS.EMAIL_IN_USE_OR_UNAVAILABLE, 403)]);
  }

  let existingUsernameOption = null;
  if (existingCredentials) {
    const profileOption = await profilesRepo.findOne("userId", existingCredentials.userId);
    existingUsernameOption = profileOption?.username || null;
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

  const tokenCreatedAt = Date.now();

  const accountActivationToken = signJwtSymmetric<AccountActivationTokenPayload>(
    // if they have no username the requesting service's frontend can ask them for one
    { email, existingUsernameOption, tokenCreatedAt },
    accountActivationPrivateKey,
    {
      expiresIn: accountActivationSessionExpirationTime,
    }
  );

  // setting the value of the account creation session as the time the token was created lets us compare
  // the token creation time with the session time to verify a valid, unused token is being used with this session
  valkeyManager.client.set(`${ACCOUNT_CREATION_SESSION_PREFIX}${email}`, tokenCreatedAt, {
    EX: parseInt(accountActivationSessionExpirationTime, 10),
  });

  res.status(200).json({ accountActivationToken });
}