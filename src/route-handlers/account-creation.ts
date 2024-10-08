import { NextFunction, Request, Response } from "express";
import { UserRegistrationUserInput } from "../validation/register-user-schema.js";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { ACCOUNT_CREATION_SESSION_PREFIX } from "../kv-store/consts.js";
import { credentialsRepo } from "../database/repos/credentials.js";
import { profilesRepo } from "../database/repos/profiles.js";
import { sendEmail } from "../emails/send-email.js";
import {
  ACCOUNT_ACTIVATION_SUBJECT,
  buildAccountActivationEmail,
} from "../emails/email-templates.js";
import createSession from "../tokens/create-session.js";
import { env } from "../utils/load-env-variables.js";
import catchUnhandledErrors from "../errors/catch-unhandled-errors.js";

export default async function accountCreationRequestHandler(
  req: Request<object, object, UserRegistrationUserInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, websiteName, activationPageUrl } = req.body;
    const existingCredentials = await credentialsRepo.findOne("emailAddress", email);

    if (existingCredentials && existingCredentials.password !== null) {
      return next([new SnowAuthError(ERROR_MESSAGES.CREDENTIALS.EMAIL_IN_USE_OR_UNAVAILABLE, 403)]);
    }

    let existingUsernameOption = null;
    if (existingCredentials) {
      const profileOption = await profilesRepo.findOne("userId", existingCredentials.userId);
      existingUsernameOption = profileOption?.username || null;
    }

    const { sessionId: accountActivationToken } = await createSession(
      ACCOUNT_CREATION_SESSION_PREFIX,
      email,
      env.ACCOUNT_ACTIVATION_SESSION_EXPIRATION
    );

    const activationPageUriWithToken = `${activationPageUrl}?token=${accountActivationToken}&email=${encodeURIComponent(
      email
    )}&existing_username_option=${encodeURIComponent(existingUsernameOption || "")}`;

    // send them an email
    sendEmail(
      email,
      ACCOUNT_ACTIVATION_SUBJECT,
      buildAccountActivationEmail(websiteName, activationPageUriWithToken, false),
      buildAccountActivationEmail(websiteName, activationPageUriWithToken, true)
    );

    res.sendStatus(201);
  } catch (error) {
    return catchUnhandledErrors(error, next);
  }
}
