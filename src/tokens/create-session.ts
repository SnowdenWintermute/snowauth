import { valkeyManager } from "../kv-store/client.js";
import { AUTH_SESSION_PREFIX } from "../kv-store/consts.js";
import { env } from "../utils/load-env-variables.js";
import crypto from "crypto";

export default async function createSession(userId: number) {
  const sessionId = await generateSessionId();

  // set a blank session id to easily check for duplicates when generating new ids
  await valkeyManager.context.client.set(sessionId, "", {
    EX: env.SESSION_EXPIRATION,
  });

  // set the user's session id
  // CONSEQUENCES: there is no way to see all sessions associated with a user without
  // scaning the entire db
  await valkeyManager.context.client.set(`${AUTH_SESSION_PREFIX}${sessionId}`, userId, {
    EX: env.SESSION_EXPIRATION,
  });

  return sessionId;
}

async function generateSessionId() {
  let sessionId;
  let duplicateKeyGenerated = true;
  while (sessionId === undefined || duplicateKeyGenerated) {
    sessionId = crypto.randomBytes(16).toString("hex");
    const maybeDuplicateId = await valkeyManager.context.client.get(sessionId);
    duplicateKeyGenerated = maybeDuplicateId !== null;
  }
  return sessionId;
}
