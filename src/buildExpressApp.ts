import express from "express";
import { ROUTE_NAMES } from "./route-names.js";
import { validate } from "./validation/validate.js";
import { registerUserSchema } from "./validation/register-user-schema.js";
import accountCreationRequestHandler from "./route-handlers/account-creation.js";
import accountActivationHandler from "./route-handlers/account-activation.js";
import { accountActivationSchema } from "./validation/account-activation-schema.js";
import loginHandler from "./route-handlers/login.js";
import { loginSchema } from "./validation/login-schema.js";
import errorHandler from "./errors/error-handler.js";
import { INCOMING_JSON_DATA_LIMIT } from "./config.js";

export default function buildExpressApp() {
  const expressApp = express();
  expressApp.use(express.json({ limit: INCOMING_JSON_DATA_LIMIT }));

  expressApp.get("/", (_req, res) => res.send("You have reached the snowauth server"));
  // USEABLE BY ANYONE
  // app.post("/users", registrationIpRateLimiter, validate(registerUserSchema), registerNewAccountHandler);
  expressApp.post(ROUTE_NAMES.USERS, validate(registerUserSchema), accountCreationRequestHandler);
  // - account activation
  // router.put("/users", accountActivationHandler);
  expressApp.put(ROUTE_NAMES.USERS, validate(accountActivationSchema), accountActivationHandler);

  // - login
  expressApp.post(ROUTE_NAMES.SESSIONS, validate(loginSchema), loginHandler);
  // - get change password email
  // router.post("/credentials", passwordResetEmailRequestIpRateLimiter, passwordResetEmailRequestHandler);
  // - change password using token in email
  // router.put("/credentials/:password_change_token", validate(changePasswordSchema), changePasswordHandler);

  // LOGGED IN USERS ONLY ONLY
  // router.use(deserializeUser, refreshSession);
  // - get profile
  // router.get("/users", getProfileHandler);
  // - delete session
  // router.delete("/sessions", deserializeUser, logoutHandler);
  // - delete user account
  // router.delete("/users/:user_id", deleteAccountHandler);

  // MODERATOR/ADMIN ONLY
  // router.use(restrictTo(UserRole.MODERATOR, UserRole.ADMIN));
  // - ban account
  // router.put(/users/bans/:user_id, banUserAccountHandler);
  expressApp.use(errorHandler);

  return expressApp;
}
