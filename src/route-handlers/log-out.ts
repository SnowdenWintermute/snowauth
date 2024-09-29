import { Request, Response, NextFunction } from "express";
import { clearSessionCookie } from "../tokens/clear-session-cookie";

export default async function logout(req: Request, res: Response, next: NextFunction) {
  const userId = res.locals.userId;
  if (typeof userId !== "number") return console.error("unexpected data type in res.locals");
  clearSessionCookie(res);
}
