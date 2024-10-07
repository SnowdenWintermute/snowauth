import { Request, Response, NextFunction } from "express";
import logUserOut from "./log-user-out.js";
import catchUnhandledErrors from "../errors/catch-unhandled-errors.js";

export default async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = res.locals.userId;
    if (typeof userId !== "number") return console.error("unexpected data type in res.locals");
    await logUserOut(req, res);

    return res.sendStatus(200);
  } catch (error) {
    return catchUnhandledErrors(error, next);
  }
}
