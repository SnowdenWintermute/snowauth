import { NextFunction, Request, Response } from "express";
import { UserRegistrationUserInput } from "../validation/register-user-schema";

export default function registerNewAccountHandler(
  req: Request<object, object, UserRegistrationUserInput>,
  res: Response,
  next: NextFunction
) {
  res.status(200).json({});
}
