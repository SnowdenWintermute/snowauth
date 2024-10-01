import { object, string, TypeOf, z } from "zod";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { PASSWORD_LENGTH } from "./config.js";

export const changePasswordSchema = object({
  body: z
    .object({
      token: string({ required_error: ERROR_MESSAGES.SESSION.MISSING_TOKEN }),
      password: string({ required_error: ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD.PASSWORD })
        .min(PASSWORD_LENGTH.MIN, ERROR_MESSAGES.VALIDATION.PASSWORD_MIN_LENGTH)
        .max(PASSWORD_LENGTH.MAX, ERROR_MESSAGES.VALIDATION.PASSWORD_MAX_LENGTH),
      passwordConfirm: string({
        required_error: ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD.PASSWORD_CONFIRMATION,
      }),
    })
    .refine((data) => data.password === data.passwordConfirm, {
      path: ["passwordConfirm"],
      message: ERROR_MESSAGES.VALIDATION.PASSWORDS_DONT_MATCH,
    }),
});

export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>;
export type ChangePasswordUserInput = TypeOf<typeof changePasswordSchema>["body"];
