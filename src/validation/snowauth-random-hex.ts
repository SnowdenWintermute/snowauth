import { z } from "zod";

export function isValidSnowAuthRandomHex(id: any) {
  const schema = z.string().regex(/^[a-f0-9]{32}$/i, "Invalid 32-character hex string");
  return schema.safeParse(id).success;
}
