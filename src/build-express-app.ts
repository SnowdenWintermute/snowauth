import express from "express";
import cors from "cors";
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
import { deleteAccountSchema } from "./validation/delete-account-schema.js";
import deleteAccountHandler from "./route-handlers/delete-account.js";
import {
  loginWithGoogleHandler,
  googleOAuthResponseHandler,
} from "./route-handlers/login-with-google.js";
import appRoute from "./utils/get-app-route-name.js";
import { env } from "./utils/load-env-variables.js";
import getUserSessionHandler from "./route-handlers/get-user-session.js";
import { changeUsernameSchema } from "./validation/change-username-schema.js";
import changeUsernameHandler from "./route-handlers/change-username.js";
import getUserSessionWithIdHandler from "./route-handlers/get-user-id.js";
import internalServicesOnlyGate from "./auth-middleware/internal-services-only.js";
import getUsernamesByIdsHandler from "./route-handlers/get-usernames-by-id.js";
import getUserIdsFromUsernamesHandler from "./route-handlers/get-user-ids-from-usernames.js";

export default function buildExpressApp() {
  const expressApp = express();
  expressApp.use(express.json({ limit: INCOMING_JSON_DATA_LIMIT }));
  expressApp.use(cookieParser());
  const corsOrigin =
    env.NODE_ENV === "production" ? "https://roguelikeracing.com" : "http://localhost:3000";
  console.log("cors origin set: ", corsOrigin);
  expressApp.use(
    cors({
      origin: corsOrigin,
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    })
  );
  // expressApp.options("*", cors()); // Allow all OPTIONS requests

  const { USERS, SESSIONS, CREDENTIALS, OAUTH, INTERNAL } = ROUTES;

  expressApp.get(appRoute(), (_req, res) => res.send("You have reached the snowauth server"));
  // USEABLE BY ANYONE
  expressApp.post(
    appRoute(USERS.ROOT),
    /* registrationIpRateLimiter */ validate(registerUserSchema),
    accountCreationRequestHandler
  );
  expressApp.put(appRoute(USERS.ROOT), validate(accountActivationSchema), accountActivationHandler);
  expressApp.post(appRoute(SESSIONS), validate(loginSchema), loginWithCredentialsHandler);
  expressApp.post(
    appRoute(CREDENTIALS.ROOT),
    validate(passwordResetEmailRequestSchema),
    /* passwordResetEmailRequestIpRateLimiter */ requestPasswordResetEmailHandler
  );

  expressApp.post(appRoute(OAUTH.ROOT, OAUTH.GOOGLE), loginWithGoogleHandler);
  expressApp.put(appRoute(OAUTH.ROOT, OAUTH.GOOGLE), googleOAuthResponseHandler);

  expressApp.put(appRoute(CREDENTIALS.ROOT), validate(changePasswordSchema), changePasswordHandler);

  expressApp.get(
    appRoute(INTERNAL, USERS.USERNAMES),
    internalServicesOnlyGate,
    getUsernamesByIdsHandler
  );

  expressApp.get(
    appRoute(INTERNAL, USERS.IDS),
    internalServicesOnlyGate,
    getUserIdsFromUsernamesHandler
  );

  // LOGGED IN USERS ONLY ONLY
  expressApp.use(getOrRefreshSession);

  // for testing purposes
  expressApp.get(appRoute(USERS.ROOT, USERS.PROTECTED), (_req, res, _next) => res.sendStatus(200));

  expressApp.get(appRoute(SESSIONS), getUserSessionHandler);

  expressApp.delete(appRoute(SESSIONS), logoutHandler);
  expressApp.delete(appRoute(USERS.ROOT), validate(deleteAccountSchema), deleteAccountHandler);

  expressApp.get(
    appRoute(INTERNAL, SESSIONS),
    internalServicesOnlyGate,
    getUserSessionWithIdHandler
  );

  expressApp.put(
    appRoute(USERS.ROOT, USERS.USERNAMES),
    validate(changeUsernameSchema),
    changeUsernameHandler
  );

  // MODERATOR/ADMIN ONLY
  // router.use(restrictTo(UserRole.MODERATOR, UserRole.ADMIN));
  // - ban account
  // router.put(/users/bans/:user_id, banUserAccountHandler);
  expressApp.use(errorHandler);

  return expressApp;
}
