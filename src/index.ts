import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import { pgOptions } from "./database/config.js";
import { ROUTE_NAMES } from "./route-names.js";
import { validate } from "./validation/validate.js";
import { registerUserSchema } from "./validation/register-user-schema.js";
import pgPool from "./database/instantiate-wrapped-pool.js";
import { valkeyManager } from "./kv-store/client.js";
import accountCreationRequestHandler from "./route-handlers/account-creation.js";
import accountActivationHandler from "./route-handlers/account-activation.js";
import { accountActivationSchema } from "./validation/account-activation-schema.js";

const PORT = 8081;
pgPool.connect(pgOptions);
await valkeyManager.connect();

const app = express();

app.get("/", (req, res) => res.send("You have reached the root route of the snowauth server"));
// USEABLE BY ANYONE
// app.post("/users", registrationIpRateLimiter, validate(registerUserSchema), registerNewAccountHandler);
app.post(ROUTE_NAMES.USERS, validate(registerUserSchema), accountCreationRequestHandler);
// - account activation
// router.put("/users", accountActivationHandler);
app.put(ROUTE_NAMES.USERS, validate(accountActivationSchema), accountActivationHandler);

// - login
// router.post("/sessions", validate(loginSchema), loginHandler);
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

app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
