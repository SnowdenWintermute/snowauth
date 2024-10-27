import { Request, Response, NextFunction } from "express";
import { env } from "../utils/load-env-variables.js";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";

export default async function internalServicesOnlyGate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const internalServicesSecretKey = req.cookies["internal"];
  if (internalServicesSecretKey !== env.INTERNAL_SERVICES_SECRET)
    return next([new SnowAuthError(ERROR_MESSAGES.INCORRECT_OR_MISSING_KEY, 401)]);
  next();
}
