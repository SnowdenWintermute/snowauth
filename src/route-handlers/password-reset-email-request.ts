import { Request, Response, NextFunction } from "express";
import { credentialsRepo } from "../database/repos/credentials.js";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { profilesRepo } from "../database/repos/profiles.js";
import { USER_STATUS } from "../database/db-consts.js";
import { PASSWORD_RESET_SESSION_PREFIX } from "../kv-store/consts.js";
import createSession from "../tokens/create-session.js";
import { env } from "../utils/load-env-variables.js";
import { PasswordResetEmailRequestUserInput } from "../validation/password-reset-email-request-schema.js";
import { sendEmail } from "../emails/send-email.js";
import { buildPasswordResetEmail, PASSWORD_RESET_SUBJECT } from "../emails/email-templates.js";
import catchUnhandledErrors from "../errors/catch-unhandled-errors.js";

export default async function requestPasswordResetEmailHandler(
  req: Request<object, object, PasswordResetEmailRequestUserInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, websiteName, resetPageUrl } = req.body;

    const credentials = await credentialsRepo.findOne("emailAddress", email);
    if (!credentials)
      return next([new SnowAuthError(ERROR_MESSAGES.USER.EMAIL_DOES_NOT_EXIST, 404)]);
    const profile = await profilesRepo.findOne("userId", credentials.userId);
    if (!profile) {
      console.error(ERROR_MESSAGES.USER.MISSING_PROFLIE);
      return next([new SnowAuthError(ERROR_MESSAGES.SERVER_GENERIC, 500)]);
    }

    if (profile.status === USER_STATUS.BANNED)
      return next([new SnowAuthError(ERROR_MESSAGES.USER.ACCOUNT_BANNED, 401)]);

    const { sessionId: passwordResetToken } = await createSession(
      PASSWORD_RESET_SESSION_PREFIX,
      credentials.emailAddress,
      env.PASSWORD_RESET_SESSION_EXPIRATION
    );

    const activationPageUrlWithToken = `${resetPageUrl}/${passwordResetToken}`;

    await sendEmail(
      email,
      PASSWORD_RESET_SUBJECT,
      buildPasswordResetEmail(websiteName, activationPageUrlWithToken, false),
      buildPasswordResetEmail(websiteName, activationPageUrlWithToken, true)
    );

    res.sendStatus(200);
  } catch (error) {
    return catchUnhandledErrors(error, next);
  }
}
