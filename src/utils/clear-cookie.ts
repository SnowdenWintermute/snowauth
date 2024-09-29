import { Response } from "express";
import cloneDeep from "lodash.clonedeep";
import { SESSION_COOKIE_OPTIONS } from "../config.js";

export function clearCookie(res: Response, cookieName: string) {
  const cookieOptions = cloneDeep(SESSION_COOKIE_OPTIONS);
  cookieOptions.maxAge = 0;
  res.cookie(cookieName, "", cookieOptions);
}
