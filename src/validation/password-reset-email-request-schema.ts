import { object, string, TypeOf, z } from "zod";
import { ERROR_MESSAGES } from "../errors/error-messages.js";

export const passwordResetEmailRequestSchema = object({
  body: z.object({
    // name: string({ required_error: ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD.NAME })
    //   .min(USERNAME_LENGTH.MIN, ERROR_MESSAGES.VALIDATION.USERNAME_MIN_LENGTH)
    //   .max(USERNAME_LENGTH.MAX, ERROR_MESSAGES.VALIDATION.USERNAME_MAX_LENGTH),
    email: string({ required_error: ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD.EMAIL }).email(
      ERROR_MESSAGES.VALIDATION.INVALID_EMAIL
    ),
    // we need the website name and page url because the snowauth server may be used for various
    // game servers, and we need to send the correct name and link in the email
    websiteName: string(),
    resetPageUrl: string().url(),
  }),
});

export type PasswordResetEmailRequestSchema = z.infer<typeof passwordResetEmailRequestSchema>;
export type PasswordResetEmailRequestUserInput = TypeOf<
  typeof passwordResetEmailRequestSchema
>["body"];
