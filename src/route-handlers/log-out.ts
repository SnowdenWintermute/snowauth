import { Request, Response, NextFunction } from "express";
import { clearCookie } from "../utils/clear-cookie.js";
import {
  REMEMBER_ME_COOKIE_NAME,
  REMEMBER_ME_SERIES_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "../config.js";
import { validateRememberMeCookie } from "../auth-middleware/get-or-refresh-session.js";
import { sessionSeriesRepo } from "../database/repos/session-series.js";

export default async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  const userId = res.locals.userId;
  if (typeof userId !== "number") return console.error("unexpected data type in res.locals");
  clearCookie(res, SESSION_COOKIE_NAME);
  clearCookie(res, REMEMBER_ME_SERIES_COOKIE_NAME);

  const rememberMeCookie = req.cookies[REMEMBER_ME_COOKIE_NAME];
  const validRememberMeCookie = validateRememberMeCookie(rememberMeCookie);
  if (validRememberMeCookie !== null) {
    const { seriesId } = validRememberMeCookie;
    await sessionSeriesRepo.delete(seriesId);
  }

  return res.sendStatus(200);
}
