import { NextFunction, Request, Response } from "express";
import { UserRegistrationUserInput } from "../validation/register-user-schema.js";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import CredentialsRepo from "../database/repos/credentials.js";
import { signJwtSymmetric } from "../tokens/index.js";
import getEnvVariable from "../utils/get-env-variable.js";
import { valkeyManager } from "../kv-store/client.js";
import { ACCOUNT_CREATION_SESSION_PREFIX } from "../kv-store/consts.js";

export default async function registerNewAccountHandler(
  req: Request<object, object, UserRegistrationUserInput>,
  res: Response,
  next: NextFunction
) {
  const { email } = req.body;
  // user enters email and password
  // check if email exists
  // if email does not exist, or if email exists and has no password, they have already created an account with an outside ID provider
  // - send confirmation email with token
  // - click link
  // - allow them to add a password to this email using the token in the email
  // - if they had no account before, also ask for a username
  // - create an account creation session with the email address as a value
  // - on submitting the new password, create the user if the email didn't exist, otherwise just add the password
  // - invalidate the account creation session
  // - create a normal session

  const existingCredentials = await CredentialsRepo.findOne("emailAddress", email);

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

  const accountCreationToken = signJwtSymmetric({ email }, accountActivationPrivateKey, {
    expiresIn: accountActivationSessionExpirationTime,
  });

  valkeyManager.client.set(`${ACCOUNT_CREATION_SESSION_PREFIX}${email}`, email, {
    EX: parseInt(accountActivationSessionExpirationTime, 10),
  });

  // await sendEmail(email, ACCOUNT_ACTIVATION_SUBJECT, buildAccountActivationText(name, token!), buildAccountActivationHTML(name, token!));

  res.status(200).json({});
}
