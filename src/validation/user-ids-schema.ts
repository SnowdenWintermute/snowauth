import { array, object, string, TypeOf } from "zod";

export const userIdsSchema = object({
  body: object({
    userIds: array(string()),
  }),
});

export type UserIdsInput = TypeOf<typeof userIdsSchema>["body"];
