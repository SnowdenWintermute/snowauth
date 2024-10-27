import { array, object, string, TypeOf } from "zod";

export const usernamesListSchema = object({
  body: object({
    userIds: array(string()),
  }),
});

export type UsernamesListInput = TypeOf<typeof usernamesListSchema>["body"];
