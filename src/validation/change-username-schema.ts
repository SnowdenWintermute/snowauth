import { object, string, TypeOf, z } from "zod";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { USERNAME_LENGTH } from "./config.js";

export const changeUsernameSchema = object({
  body: z.object({
    newUsername: string()
      .min(USERNAME_LENGTH.MIN, ERROR_MESSAGES.VALIDATION.USERNAME_MIN_LENGTH)
      .max(USERNAME_LENGTH.MAX, ERROR_MESSAGES.VALIDATION.USERNAME_MAX_LENGTH),
  }),
});

export type ChangeUserameSchema = z.infer<typeof changeUsernameSchema>;
export type ChangeUsernameInput = TypeOf<typeof changeUsernameSchema>["body"];
