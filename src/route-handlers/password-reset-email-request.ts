import { Request, Response, NextFunction } from "express";
import { credentialsRepo } from "../database/repos/credentials";
import SnowAuthError from "../errors/custom-error";
import { ERROR_MESSAGES } from "../errors/error-messages";
import { profilesRepo } from "../database/repos/profiles";
import { USER_STATUS } from "../database/db-consts";
import { PASSWORD_RESET_SESSION_PREFIX } from "../kv-store/consts";
import createSession from "../tokens/create-session";
import { env } from "../utils/load-env-variables";
import { PasswordResetEmailRequestUserInput } from "../validation/password-reset-email-request-schema";

export default async function requestPasswordResetEmailHandler(
  req: Request<object, object, PasswordResetEmailRequestUserInput>,
  res: Response,
  next: NextFunction
) {
  const { email, websiteName, resetPageUrl } = req.body;

  const credentials = await credentialsRepo.findOne("emailAddress", email);
  if (!credentials) return next([new SnowAuthError(ERROR_MESSAGES.USER.EMAIL_DOES_NOT_EXIST, 404)]);
  const profile = await profilesRepo.findOne("userId", credentials.userId);
  if (!profile) {
    console.error(ERROR_MESSAGES.USER.MISSING_PROFLIE);
    return next([new SnowAuthError(ERROR_MESSAGES.SERVER_GENERIC, 500)]);
  }

  if (profile.status === USER_STATUS.BANNED)
    return next([new SnowAuthError(ERROR_MESSAGES.USER.ACCOUNT_BANNED, 401)]);

  const { sessionId: accountActivationToken } = await createSession(
    PASSWORD_RESET_SESSION_PREFIX,
    credentials.emailAddress,
    env.PASSWORD_RESET_SESSION_EXPIRATION
  );

  const activationPageUrlWithToken = `${resetPageUrl}/${accountActivationToken}`;

  // const htmlOutput = buildPasswordResetHTML(user.email, passwordResetToken!);
  // const textOutput = buildPasswordResetText(user.email, passwordResetToken!);

  // await sendEmail(req.body.email, RESET_PASSWORD_SUBJECT, textOutput, htmlOutput);
  res.sendStatus(200);
}
