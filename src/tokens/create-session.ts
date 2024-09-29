import crypto from "crypto";
import { valkeyManager } from "../kv-store/client.js";
import { hashToken } from "./hashing-utils.js";

export default async function createSession(prefix: string, data: any, expiration: number) {
  const { sessionId, hashedSessionId, sessionName } = await generateSessionId(prefix);
  // CONSEQUENCES: there is no way to see all sessions associated with a user without
  // scaning the entire db
  await valkeyManager.context.set(`${prefix}${hashedSessionId}`, data, {
    EX: expiration,
  });

  return { sessionId, hashedSessionId, sessionName };
}

async function generateSessionId(prefix: string) {
  let sessionId;
  let hashedSessionId;
  let sessionName;
  let duplicateKeyGenerated = true;
  while (
    sessionId === undefined ||
    hashedSessionId === undefined ||
    sessionName === undefined ||
    duplicateKeyGenerated
  ) {
    sessionId = crypto.randomBytes(16).toString("hex");
    hashedSessionId = hashToken(sessionId);
    sessionName = `${prefix}${hashedSessionId}`;
    const maybeDuplicateId = await valkeyManager.context.get(`${prefix}${hashedSessionId}`);
    duplicateKeyGenerated = maybeDuplicateId !== null;
  }
  return { sessionId, hashedSessionId, sessionName };
}
