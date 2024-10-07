import { NextFunction } from "express";
import SnowAuthError from "./custom-error.js";

export default function catchUnhandledErrors(error: any, next: NextFunction) {
  const errors = [];
  if (error.schema && error.detail) {
    // probably a postgres error
    console.error("pg error: ", error.code, JSON.stringify(error, null, 2));
    if (error.column)
      errors.push(new SnowAuthError(`Database error - problem relating to ${error.column}`, 400));
    else if (error.detail)
      errors.push(new SnowAuthError(`Database error - detail: ${error.detail}`, 400));
  } else if (error instanceof SnowAuthError) {
    errors.push(error);
  } else if (error.message && error.status) {
    errors.push(new SnowAuthError(error.message, error.code));
  }
  return next(errors);
}
