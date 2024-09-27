import { valkeyManager } from "../kv-store/client.js";
import { AUTH_SESSION_PREFIX } from "../kv-store/consts.js";
import { signJwtSymmetric } from "../tokens/index.js";
import { env } from "./load-env-variables.js";

export default async function signTokenAndCreateSession(email: string, userId: number) {
  const accessToken = signJwtSymmetric({ email }, env.ACCESS_TOKEN_PRIVATE_KEY, {
    expiresIn: `${env.ACCESS_TOKEN_EXPIRATION / 1000 / 60}m`,
  });
  await valkeyManager.context.client.set(`${AUTH_SESSION_PREFIX}${userId}`, userId, {
    EX: env.AUTH_SESSION_EXPIRATION,
  });

  return accessToken;
}
