import express from "express";
import cookieParser from "cookie-parser";
import { ROUTES } from "./route-names.js";
import { validate } from "./validation/validate.js";
import { registerUserSchema } from "./validation/register-user-schema.js";
import accountCreationRequestHandler from "./route-handlers/account-creation.js";
import accountActivationHandler from "./route-handlers/account-activation.js";
import { accountActivationSchema } from "./validation/account-activation-schema.js";
import { loginSchema } from "./validation/login-schema.js";
import errorHandler from "./errors/error-handler.js";
import { INCOMING_JSON_DATA_LIMIT } from "./config.js";
import loginWithCredentialsHandler from "./route-handlers/login-with-credentials.js";
import getOrRefreshSession from "./auth-middleware/get-or-refresh-session.js";
import logoutHandler from "./route-handlers/log-out.js";
import requestPasswordResetEmailHandler from "./route-handlers/password-reset-email-request.js";
import { passwordResetEmailRequestSchema } from "./validation/password-reset-email-request-schema.js";
import { changePasswordSchema } from "./validation/change-password-schema.js";
import changePasswordHandler from "./route-handlers/change-password.js";

export default function buildExpressApp() {
  const expressApp = express();
  expressApp.use(express.json({ limit: INCOMING_JSON_DATA_LIMIT }));
  expressApp.use(cookieParser());

  const { USERS, SESSIONS, CREDENTIALS } = ROUTES;

  expressApp.get("/", (_req, res) => res.send("You have reached the snowauth server"));
  // USEABLE BY ANYONE
  expressApp.post(
    USERS.ROOT,
    /* registrationIpRateLimiter */ validate(registerUserSchema),
    accountCreationRequestHandler
  );
  expressApp.put(USERS.ROOT, validate(accountActivationSchema), accountActivationHandler);
  expressApp.post(SESSIONS, validate(loginSchema), loginWithCredentialsHandler);
  expressApp.post(
    CREDENTIALS.ROOT,
    validate(passwordResetEmailRequestSchema),
    /* passwordResetEmailRequestIpRateLimiter */ requestPasswordResetEmailHandler
  );
  expressApp.put(CREDENTIALS.ROOT, validate(changePasswordSchema), changePasswordHandler);

  // LOGGED IN USERS ONLY ONLY
  expressApp.use(getOrRefreshSession);

  // for testing
  expressApp.get(USERS.ROOT + USERS.PROTECTED, (_req, res, _next) => res.sendStatus(200));
  expressApp.delete(SESSIONS, logoutHandler);
  // - delete user account
  // router.delete("/users/:user_id", deleteAccountHandler);

  // MODERATOR/ADMIN ONLY
  // router.use(restrictTo(UserRole.MODERATOR, UserRole.ADMIN));
  // - ban account
  // router.put(/users/bans/:user_id, banUserAccountHandler);
  expressApp.use(errorHandler);

  return expressApp;
}
