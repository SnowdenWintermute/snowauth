import { env } from "./utils/load-env-variables.js";

export const ROUTES = {
  ROOT: env.NODE_ENV === "production" ? "/auth" : "",
  USERS: {
    ROOT: "/users",
    PROTECTED: "/protected",
  },
  CREDENTIALS: {
    ROOT: "/credentials",
    GOOGLE: "/google-auth",
  },
  OAUTH: {
    ROOT: "/oauth",
    GOOGLE: "/google",
  },
  SESSIONS: "/sessions",
};
