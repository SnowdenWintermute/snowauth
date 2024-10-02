import { Request, Response, NextFunction } from "express";
import logUserOut from "./log-user-out.js";
import { userIdsRepo } from "../database/repos/user-ids.js";
import { DeleteAccountUserInput } from "../validation/delete-account-schema.js";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";

export default async function deleteAccountHandler(
  req: Request<object, object, DeleteAccountUserInput>,
  res: Response,
  next: NextFunction
) {
  const userId = res.locals.userId;
  if (typeof userId !== "number") return console.error("unexpected data type in res.locals");
  if (!req.body.confirmDeletion)
    return next([
      new SnowAuthError(ERROR_MESSAGES.VALIDATION.DELETE_CONFIRMATION_NOT_CHECKED, 400),
    ]);

  await logUserOut(req as Request, res);

  // cascading deletion handles all rows associated with this user
  await userIdsRepo.delete(userId);

  // @TODO
  // tell any subscribed services (game servers) to handle account deletion (disconnect them, delete their game data)

  return res.sendStatus(200);
}
