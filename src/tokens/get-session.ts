import { valkeyManager } from "../kv-store/client.js";
import { hashToken } from "./hashing-utils.js";

export default async function getSession(prefix: string, id: string) {
  const hashedId = hashToken(id);
  return await valkeyManager.context.get(`${prefix}${hashedId}`);
}
