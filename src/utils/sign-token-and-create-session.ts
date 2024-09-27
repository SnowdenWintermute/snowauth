import { valkeyManager } from "../kv-store/client.js";
import { AUTH_SESSION_PREFIX } from "../kv-store/consts.js";
import { signJwtSymmetric } from "../tokens/index.js";
import getEnvVariable from "./get-env-variable.js";

export default async function signTokenAndCreateSession(email: string, userId: number) {
  const accessTokenPrivateKey = getEnvVariable("ACCESS_TOKEN_PRIVATE_KEY");
  if (accessTokenPrivateKey instanceof Error) return accessTokenPrivateKey;
  const accessTokenExpiration = getEnvVariable("ACCESS_TOKEN_EXPIRATION_TIME");
  if (accessTokenExpiration instanceof Error) return accessTokenExpiration;
  const authSessionExpiration = getEnvVariable("AUTH_SESSION_EXPIRATION");
  if (authSessionExpiration instanceof Error) return authSessionExpiration;

  const accessToken = signJwtSymmetric({ email }, accessTokenPrivateKey, {
    expiresIn: `${parseInt(accessTokenExpiration, 10) / 1000 / 60}m`,
  });

  await valkeyManager.client.set(`${AUTH_SESSION_PREFIX}${userId}`, userId, {
    EX: parseInt(authSessionExpiration, 10),
  });

  return accessToken;
}
