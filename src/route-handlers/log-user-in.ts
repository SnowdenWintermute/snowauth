import { Response } from "express";
import * as argon2 from "argon2";
import { Credentials } from "../database/repos/credentials.js";
import {
  REMEMBER_ME_COOKIE_NAME,
  REMEMBER_ME_COOKIE_OPTIONS,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "../config.js";
import { env } from "../utils/load-env-variables.js";
import createSession from "../tokens/create-session.js";
import crypto from "crypto";
import { sessionSeriesRepo } from "../database/repos/session_series.js";

export async function logUserIn(res: Response, credentials: Credentials, shouldRemember: boolean) {
  res.setHeader("Cache-Control", 'no-cache="Set-Cookie"');

  const sessionId = await createSession(credentials.userId);
  res.cookie(SESSION_COOKIE_NAME, sessionId, SESSION_COOKIE_OPTIONS);
  if (!shouldRemember) return;

  const seriesId = await generateSeriesId();
  const token = crypto.randomBytes(16).toString("hex");
  const hashedToken = await argon2.hash(token, {
    hashLength: 32,
    type: argon2.argon2id,
    secret: Buffer.from(env.HASHING_PEPPER),
  });

  await sessionSeriesRepo.insert(seriesId, credentials.userId, hashedToken);

  const rememberMeCookie = JSON.stringify({
    REMEMBER_ME_SERIES_COOKIE_NAME: seriesId,
    REMEMBER_ME_TOKEN_COOKIE_NAME: token,
  });

  res.cookie(REMEMBER_ME_COOKIE_NAME, rememberMeCookie, REMEMBER_ME_COOKIE_OPTIONS);
}

async function generateSeriesId() {
  let id;
  let duplicateKeyGenerated = true;
  while (id === undefined || duplicateKeyGenerated) {
    id = crypto.randomBytes(16).toString("hex");
    const maybeDuplicateId = await sessionSeriesRepo.findById(id);
    duplicateKeyGenerated = maybeDuplicateId !== undefined;
  }
  return id;
}
