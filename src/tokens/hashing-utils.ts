import crypto from "crypto";
import { env } from "../utils/load-env-variables.js";

export function hashToken(token: string) {
  const hashedToken = crypto.createHmac("sha256", env.SESSION_HASH_KEY).update(token).digest("hex");
  return hashedToken;
}

export function tokenIsValid(provided: string, stored: string) {
  const hashedProvided = hashToken(provided);

  return crypto.timingSafeEqual(Buffer.from(hashedProvided, "utf-8"), Buffer.from(stored, "utf-8"));
}
