import request from "supertest";
import { SnowAuthErrorDetails } from "../../errors/custom-error.js";

export function responseBodyIncludesCustomErrorMessage(
  res: request.Response,
  errorMessage: string
) {
  return res.body.errors.map((error: SnowAuthErrorDetails) => error.message).includes(errorMessage);
}
export function responseBodyIncludesCustomErrorField(res: request.Response, field: string) {
  return res.body.errors.map((error: SnowAuthErrorDetails) => error.field).includes(field);
}
