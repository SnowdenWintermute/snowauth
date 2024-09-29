import { Response } from "express";
import cloneDeep from "lodash.clonedeep";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "../config";

export function clearSessionCookie(res: Response) {
  const cookieOptions = cloneDeep(SESSION_COOKIE_OPTIONS);
  cookieOptions.maxAge = 0;
  res.cookie(SESSION_COOKIE_NAME, "", cookieOptions);
}
//TODO - JUST MAKE A CLEAR COOKIE FUNCTION
export function clearSessionCookie(res: Response) {
  const cookieOptions = cloneDeep(SESSION_COOKIE_OPTIONS);
  cookieOptions.maxAge = 0;
  res.cookie(SESSION_COOKIE_NAME, "", cookieOptions);
}
