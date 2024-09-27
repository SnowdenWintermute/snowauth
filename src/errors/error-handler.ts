import { NextFunction, Request, Response } from "express";
import { ERROR_MESSAGES } from "./error-messages.js";
import SnowAuthError, { SnowAuthErrorDetails } from "./custom-error.js";

export default function errorHandler(error: any, _req: Request, res: Response, next: NextFunction) {
  let status;
  let errors: SnowAuthErrorDetails[] | undefined;
  if (error[0] instanceof SnowAuthError) {
    status = error[0].status;
    errors = error.map((customError: SnowAuthError) => {
      const errorToReturn: SnowAuthErrorDetails = { message: customError.message };
      if (customError.formField) errorToReturn.field = customError.formField;
      return errorToReturn;
    });
  } else console.error("non-custom error in handler: ", error);
  //
  let jsonToSend;
  if (errors) jsonToSend = errors;
  else jsonToSend = [{ message: ERROR_MESSAGES.SERVER_GENERIC, error }];

  res.status(status || error.status || 500).json(jsonToSend);
}
