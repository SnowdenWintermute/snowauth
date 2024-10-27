import { Response, NextFunction, Request } from "express";
import { UserIdsInput } from "../validation/user-ids-schema.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { profilesRepo } from "../database/repos/profiles.js";
import catchUnhandledErrors from "../errors/catch-unhandled-errors.js";
import SnowAuthError from "../errors/custom-error.js";

export default async function getUsernamesByIdsHandler(
  req: Request<object, object, UserIdsInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { ids } = req.query;
    console.log("got ids: ", ids);
    if (typeof ids !== "string") return next([new SnowAuthError("Invalid query string", 400)]);
    const userIds = ids ? ids.split(",") : [];
    const promises: Promise<void>[] = [];
    const usernamesById: { [userId: string]: string } = {};

    for (const userId of userIds) {
      promises.push(
        new Promise(async (resolve, reject) => {
          const profile = await profilesRepo.findOne("userId", userId);
          if (!profile) {
            console.error(ERROR_MESSAGES.USER.MISSING_PROFLIE);
            reject();
          } else {
            usernamesById[userId] = profile.username;
            resolve();
          }
        })
      );
    }

    await Promise.all(promises);

    res.json(usernamesById);
  } catch (error) {
    return catchUnhandledErrors(error, next);
  }
}
