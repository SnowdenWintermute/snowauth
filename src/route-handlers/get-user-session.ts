import { Request, Response, NextFunction } from "express";
import catchUnhandledErrors from "../errors/catch-unhandled-errors.js";
import { profilesRepo } from "../database/repos/profiles.js";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";

export default async function getUserSessionHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = res.locals.userId;
    if (typeof userId !== "number") return console.error("unexpected data type in res.locals");
    const profile = await profilesRepo.findOne("userId", userId);
    if (profile === undefined)
      return next([new SnowAuthError(ERROR_MESSAGES.USER.MISSING_PROFILE, 500)]);

    res.status(200).json({ username: profile.username });
  } catch (error) {
    return catchUnhandledErrors(error, next);
  }
}
