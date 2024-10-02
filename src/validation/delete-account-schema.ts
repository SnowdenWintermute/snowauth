import { boolean, object, TypeOf, z } from "zod";

export const deleteAccountSchema = object({
  body: z.object({
    confirmDeletion: boolean(),
  }),
});

export type DeleteAccountSchema = z.infer<typeof deleteAccountSchema>;
export type DeleteAccountUserInput = TypeOf<typeof deleteAccountSchema>["body"];
