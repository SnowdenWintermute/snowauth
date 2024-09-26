import { object, string, TypeOf, z } from "zod";
import { ERROR_MESSAGES } from "../errors/error-messages.js";

export const registerUserSchema = object({
  body: z.object({
    // name: string({ required_error: ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD.NAME })
    //   .min(USERNAME_LENGTH.MIN, ERROR_MESSAGES.VALIDATION.USERNAME_MIN_LENGTH)
    //   .max(USERNAME_LENGTH.MAX, ERROR_MESSAGES.VALIDATION.USERNAME_MAX_LENGTH),
    email: string({ required_error: ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD.EMAIL }).email(
      ERROR_MESSAGES.VALIDATION.INVALID_EMAIL
    ),
  }),
});

export type RegisterUserSchema = z.infer<typeof registerUserSchema>;
export type UserRegistrationUserInput = TypeOf<typeof registerUserSchema>["body"];
