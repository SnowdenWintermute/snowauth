import { Response, NextFunction, Request } from "express";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { profilesRepo } from "../database/repos/profiles.js";
import catchUnhandledErrors from "../errors/catch-unhandled-errors.js";
import SnowAuthError from "../errors/custom-error.js";
import { UsernamesListInput } from "../validation/usernames-list-schema.js";

export default async function getUserIdsFromUsernamesHandler(
  req: Request<object, object, UsernamesListInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { usernames } = req.query;
    console.log("got usernames: ", usernames);
    if (typeof usernames !== "string")
      return next([new SnowAuthError("Invalid query string", 400)]);
    const usernamesArray = usernames ? usernames.split(",") : [];
    const promises: Promise<void>[] = [];
    const idsByUsername: { [username: string]: number } = {};

    for (const username of usernamesArray) {
      promises.push(
        new Promise(async (resolve, reject) => {
          const profile = await profilesRepo.findOne("username", username);
          if (!profile) {
            console.error(ERROR_MESSAGES.USER.MISSING_PROFLIE);
            reject();
          } else {
            idsByUsername[username] = profile.userId;
            resolve();
          }
        })
      );
    }

    await Promise.all(promises);

    res.json(idsByUsername);
  } catch (error) {
    return catchUnhandledErrors(error, next);
  }
}
