import { Request, Response } from "express";
import { clearCookie } from "../utils/clear-cookie.js";
import {
  REMEMBER_ME_COOKIE_NAME,
  REMEMBER_ME_SERIES_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "../config.js";
import { validateRememberMeCookie } from "../auth-middleware/get-or-refresh-session.js";
import { sessionSeriesRepo } from "../database/repos/session-series.js";
import { isValidSnowAuthRandomHex } from "../validation/snowauth-random-hex.js";
import { valkeyManager } from "../kv-store/client.js";
import { AUTH_SESSION_PREFIX } from "../kv-store/consts.js";

export default async function logUserOut(req: Request, res: Response) {
  clearCookie(res, SESSION_COOKIE_NAME);
  clearCookie(res, REMEMBER_ME_SERIES_COOKIE_NAME);

  const sessionId = req.cookies[SESSION_COOKIE_NAME];
  if (isValidSnowAuthRandomHex(sessionId))
    valkeyManager.context.del(`${AUTH_SESSION_PREFIX}${sessionId || ""}`);

  const rememberMeCookie = req.cookies[REMEMBER_ME_COOKIE_NAME];
  const validRememberMeCookie = validateRememberMeCookie(rememberMeCookie);
  if (validRememberMeCookie !== null) {
    const { seriesId } = validRememberMeCookie;
    await sessionSeriesRepo.delete(seriesId.toString());
  }
}
