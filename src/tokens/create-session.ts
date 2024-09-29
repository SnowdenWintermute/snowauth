import crypto from "crypto";
import { valkeyManager } from "../kv-store/client.js";
import { AUTH_SESSION_PREFIX } from "../kv-store/consts.js";
import { env } from "../utils/load-env-variables.js";
import { hashToken } from "./hashing-utils.js";

export default async function createSession(userId: number) {
  const { sessionId, hashedSessionId } = await generateSessionId();
  // CONSEQUENCES: there is no way to see all sessions associated with a user without
  // scaning the entire db
  await valkeyManager.context.client.set(`${AUTH_SESSION_PREFIX}${hashedSessionId}`, userId, {
    EX: env.SESSION_EXPIRATION,
  });

  return sessionId;
}

async function generateSessionId() {
  let sessionId;
  let hashedSessionId;
  let duplicateKeyGenerated = true;
  while (sessionId === undefined || hashedSessionId === undefined || duplicateKeyGenerated) {
    sessionId = crypto.randomBytes(16).toString("hex");
    hashedSessionId = hashToken(sessionId);

    const maybeDuplicateId = await valkeyManager.context.client.get(
      `${AUTH_SESSION_PREFIX}${hashedSessionId}`
    );
    duplicateKeyGenerated = maybeDuplicateId !== null;
  }
  return { sessionId, hashedSessionId };
}
