import { Request, Response, NextFunction } from "express";
import logUserOut from "./log-user-out.js";

export default async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  const userId = res.locals.userId;
  if (typeof userId !== "number") return console.error("unexpected data type in res.locals");
  await logUserOut(req, res);

  return res.sendStatus(200);
}
