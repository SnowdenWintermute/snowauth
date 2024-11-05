import { Request, Response, NextFunction } from "express";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import catchUnhandledErrors from "../errors/catch-unhandled-errors.js";
import { profilesRepo } from "../database/repos/profiles.js";
import { ChangeUsernameInput } from "../validation/change-username-schema.js";

export default async function changeUsernameHandler(
  req: Request<object, object, ChangeUsernameInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { newUsername } = req.body;
    const userId = res.locals.userId;

    const profile = await profilesRepo.findOne("userId", userId);

    if (profile === undefined) {
      console.log(ERROR_MESSAGES.USER.MISSING_PROFILE);
      return next([new SnowAuthError(ERROR_MESSAGES.SERVER_GENERIC, 500)]);
    }

    const existingUsername = await profilesRepo.findOne("username", newUsername);
    if (existingUsername !== undefined)
      return next([new SnowAuthError(ERROR_MESSAGES.USER.NAME_IN_USE_OR_UNAVAILABLE, 400)]);

    profile.username = newUsername;
    await profilesRepo.update(profile);

    res.status(201).json({ newUsername: newUsername });
  } catch (error) {
    return catchUnhandledErrors(error, next);
  }
}
