import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../utils/load-env-variables.js";
import { ROUTES } from "../route-names.js";
import appRoute from "../utils/get-app-route-name.js";
import {
  OAUTH_COOKIE_OPTIONS,
  OAUTH_NONCE_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
} from "../config.js";
import SnowAuthError from "../errors/custom-error.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { clearCookie } from "../utils/clear-cookie.js";
import { valkeyManager } from "../kv-store/client.js";
import { OAUTH_NONCE_PREFIX } from "../kv-store/consts.js";
import { googleOAuthIDTokenPayloadSchema } from "../validation/google-id-token-payload-schema.js";
import { credentialsRepo } from "../database/repos/credentials.js";
import insertNewUser from "../database/utils/insert-new-user.js";
import { profilesRepo } from "../database/repos/profiles.js";
import { generateRandomUsername } from "../utils/random-names.js";
import createSession from "../tokens/create-session.js";
import { logUserIn } from "./log-user-in.js";

export async function loginWithGoogleHandler(req: Request, res: Response, next: NextFunction) {
  // google ouath2 discovery document https://accounts.google.com/.well-known/openid-configuration
  // authorization_endpoint gives us:
  const googleOauth2BaseUri = "https://accounts.google.com/o/oauth2/v2/auth";
  // these are the required parameters that the client must include in their GET request to google's auth server
  const client_id = env.GOOGLE_OAUTH_CLIENT_ID;
  const response_type = "code";
  const scope = "openid email";
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie(OAUTH_STATE_COOKIE_NAME, state, OAUTH_COOKIE_OPTIONS);

  const nonce = crypto.randomBytes(16).toString("hex");
  res.cookie(OAUTH_NONCE_COOKIE_NAME, nonce, OAUTH_COOKIE_OPTIONS);
  const nonceValkeyName = `${OAUTH_NONCE_PREFIX}${nonce}`;
  console.log("setting nonce valkey name: ", nonceValkeyName);
  await valkeyManager.context.set(nonceValkeyName, "", {
    PX: env.OAUTH_STATE_COOKIE_EXPIRATION,
  });

  const redirect_uri = getGoogleOAuthRedirectURI();

  // build the url that the client must send a GET request to
  const requestUri = `${googleOauth2BaseUri}?response_type=${response_type}&client_id=${client_id}&scope=${encodeURIComponent(
    scope
  )}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}&nonce=${nonce}`;

  res.status(201).send({ requestUri });
}

export async function googleOAuthResponseHandler(req: Request, res: Response, next: NextFunction) {
  const { OAUTH } = ERROR_MESSAGES;
  // google will redirect the frontend to a page in our browser app once the user completes the sign in on google's page
  // our browser app must call this endpoint and include the code and state parameters in the query string
  // of the url that google redirected them to (a page in our browser app)

  if (typeof req.body.code !== "string" || typeof req.body.state !== "string") {
    return next([new SnowAuthError(ERROR_MESSAGES.OAUTH.STATE, 403)]);
  }
  const { state, code } = req.body;
  const stateCookie = req.cookies[OAUTH_STATE_COOKIE_NAME];
  const nonceCookie = req.cookies[OAUTH_NONCE_COOKIE_NAME];

  // don't let them reuse the same cookies
  clearCookie(res, OAUTH_STATE_COOKIE_NAME);
  clearCookie(res, OAUTH_NONCE_COOKIE_NAME);

  if (state !== stateCookie) return next([new SnowAuthError(OAUTH.STATE, 403)]);

  const token_endpoint = "https://oauth2.googleapis.com/token"; // from the discovery document
  const redirect_uri = getGoogleOAuthRedirectURI();

  const response = await fetch(token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      code,
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: redirect_uri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    console.error(response);
    return next([new SnowAuthError(OAUTH.AUTH_SERVER_ERROR, 500)]);
  }

  const body = await response.json();
  if (typeof body.id_token !== "string") {
    return next([new SnowAuthError(OAUTH.MISSING_ID_TOKEN, 404)]);
  }

  // unpack and validate the payload
  const decoded = jwt.decode(body.id_token, { complete: true });
  if (!decoded?.payload) return next([new SnowAuthError(OAUTH.INVALID_ID_TOKEN, 401)]);
  const validatedPayload = googleOAuthIDTokenPayloadSchema.safeParse(decoded.payload);
  if (!validatedPayload.success) {
    console.error("googleOAuthIDTokenPayloadSchema failed to match google's response");
    return next([new SnowAuthError(OAUTH.INVALID_ID_TOKEN, 401)]);
  }
  const payload = validatedPayload.data;
  console.log("BODY: ", body);
  console.log("PAYLOAD: ", payload);

  const nonceExists = await valkeyManager.context.del(`${OAUTH_NONCE_PREFIX}${payload.nonce}`);
  console.log("nonceExists", nonceExists);
  // it should equal 1 if it exists because redis DEL returns the number of keys removed
  if (nonceExists !== 1 || nonceCookie !== payload.nonce)
    return next([new SnowAuthError(OAUTH.MISMATCHED_OR_USED_NONCE, 403)]);

  // make sure the user's email is verified by google
  if (!payload.email_verified) return next([new SnowAuthError(OAUTH.UNVERIFIED_EMAIL, 400)]);
  // create the user and their credentials if they don't exist
  const existingCredentials = await credentialsRepo.findOne("emailAddress", payload.email);
  const alreadyRegistered = existingCredentials !== undefined;

  let userId: number;
  let username: string | undefined;
  if (alreadyRegistered) {
    const existingProfile = await profilesRepo.findOne("userId", existingCredentials.userId);
    if (!existingProfile) {
      console.error(ERROR_MESSAGES.USER.MISSING_PROFLIE);
      return next([new SnowAuthError(ERROR_MESSAGES.SERVER_GENERIC, 500)]);
    }
    username = existingProfile.username;
    userId = existingProfile.userId;
  } else {
    let randomUsernameAlreadyExists = true;
    while (randomUsernameAlreadyExists || username === undefined) {
      username = generateRandomUsername();
      const existingProfile = await profilesRepo.findOne("username", username);
      randomUsernameAlreadyExists = existingProfile !== undefined;
    }

    const userRecord = await insertNewUser(payload.email, null, username);
    userId = userRecord.id;
  }
  // create the user's session
  await logUserIn(res, userId);

  // if not already registered, show the autogenerated username and prompt for a username change
  // if they don't submit a username change they can keep the autogenerated one
  // the user's browser will handle redirecting them on success or showing an error if not
  res.status(201).json({ alreadyRegistered, username });

  // @TODO - IF WE EVER WANT TO PASS THIS TOKEN BETWEEN SERVICES
  // before using the id token in other services, they must validate it:
  // https://developers.google.com/identity/openid-connect/openid-connect#validatinganidtoken
  // but it is fine to use it here on the server because we know it came from google directly
  // TO VERIFY
  // find out which key was used by reading the jwt header from decoded.header
  // fetch the google public keys from https://www.googleapis.com/oauth2/v3/certs (link is from discovery document)
  // convert the keys which are in JWK format to PEM format using a library
  // call jwt.verify with the PEM format key
  // decoded.iss must equal https://accounts.google.com OR accounts.google.com
  // decoded.aud must equal our google client id
  // decoded.exp must not be in the past
}

function getGoogleOAuthRedirectURI() {
  const { OAUTH } = ROUTES;
  const productionGoogleRedirectURI = "https://roguelikeracing.com/auth";
  const devGoogleRedirectURI = "http://localhost:3000";
  const googleRedirectURIPath = appRoute(OAUTH.ROOT, OAUTH.GOOGLE);
  const baseRedirectURI =
    env.NODE_ENV === "production" ? productionGoogleRedirectURI : devGoogleRedirectURI;
  return baseRedirectURI + googleRedirectURIPath;
}
