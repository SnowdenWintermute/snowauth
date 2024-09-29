import { Response } from "express";
import { Credentials } from "../database/repos/credentials.js";
import {
  REMEMBER_ME_COOKIE_NAME,
  REMEMBER_ME_COOKIE_OPTIONS,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "../config.js";
import createSession from "../tokens/create-session.js";
import crypto from "crypto";
import { sessionSeriesRepo } from "../database/repos/session-series.js";
import { hashToken } from "../tokens/hashing-utils.js";
import { AUTH_SESSION_PREFIX } from "../kv-store/consts.js";
import { env } from "../utils/load-env-variables.js";

export async function logUserIn(res: Response, credentials: Credentials, shouldRemember: boolean) {
  // don't fully understand how this works
  res.setHeader("Cache-Control", 'no-cache="Set-Cookie", no-store="Set-Cookie"');

  const { sessionId } = await createSession(
    AUTH_SESSION_PREFIX,
    credentials.userId,
    env.SESSION_EXPIRATION
  );
  res.cookie(SESSION_COOKIE_NAME, sessionId, SESSION_COOKIE_OPTIONS);
  if (!shouldRemember) return;

  const sessionSeriesId = await generateSessionSeriesId();
  const token = crypto.randomBytes(16).toString("hex");
  const hashedToken = hashToken(token);

  await sessionSeriesRepo.insert(sessionSeriesId, credentials.userId, hashedToken);

  const rememberMeCookie = JSON.stringify({
    REMEMBER_ME_SERIES_COOKIE_NAME: sessionSeriesId,
    REMEMBER_ME_TOKEN_COOKIE_NAME: token,
  });

  res.cookie(REMEMBER_ME_COOKIE_NAME, rememberMeCookie, REMEMBER_ME_COOKIE_OPTIONS);
}

async function generateSessionSeriesId() {
  let id;
  let duplicateKeyGenerated = true;
  while (id === undefined || duplicateKeyGenerated) {
    id = crypto.randomBytes(16).toString("hex");
    const maybeDuplicateId = await sessionSeriesRepo.findById(id);
    duplicateKeyGenerated = maybeDuplicateId !== undefined;
  }
  return id;
}
