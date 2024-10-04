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
  res.cookie(OAUTH_NONCE_COOKIE_NAME, state, OAUTH_COOKIE_OPTIONS);

  const nonce = crypto.randomBytes(16).toString("hex");
  await valkeyManager.context.set(OAUTH_NONCE_PREFIX, nonce, {
    PX: env.OAUTH_STATE_COOKIE_EXPIRATION,
  });

  const redirect_uri = getGoogleOauthRedirectURI();

  // build the url that the client must send a GET request to
  const requestUri = `${googleOauth2BaseUri}?response_type=${response_type}&client_id=${client_id}&scope=${encodeURIComponent(
    scope
  )}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}&nonce=${nonce}`;

  res.status(201).send({ requestUri });
}

export async function googleOauthResponseHandler(req: Request, res: Response, next: NextFunction) {
  // google will redirect the frontend to this endpoint once the user completes the sign in on google's page
  // make a request to our backend so we can include the state cookie and include the query string in our request
  // parse the query string from google
  // get a code
  // make a request to this address obtained in the discovery document under token_endpoint with the code
  // to get their id_token
  // https://oauth2.googleapis.com/token
  // const fullUrlString = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  // const requestUrlObject = new URL(fullUrlString);
  // const requestQueryParams = new URLSearchParams(requestUrlObject.search);
  // const state = requestQueryParams.get("state");

  if (typeof req.body.code !== "string" || typeof req.body.state !== "string") {
    return next([new SnowAuthError(ERROR_MESSAGES.CREDENTIALS.OAUTH_STATE, 403)]);
  }
  const { state, code } = req.body;
  const stateCookie = req.cookies[OAUTH_STATE_COOKIE_NAME];
  const nonceCookie = req.cookies[OAUTH_NONCE_COOKIE_NAME];
  console.log("req.cookies", req.cookies);
  // delete their oauth state cookie
  clearCookie(res, OAUTH_STATE_COOKIE_NAME);
  clearCookie(res, OAUTH_NONCE_COOKIE_NAME);
  // check if state param equals our saved state param
  if (state !== stateCookie)
    return next([new SnowAuthError(ERROR_MESSAGES.CREDENTIALS.OAUTH_STATE, 401)]);

  // from the discovery document
  const token_endpoint = "https://oauth2.googleapis.com/token";
  const redirect_uri = getGoogleOauthRedirectURI();

  // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  // TODO -wrap fetch requests in a trycatch

  console.log(code, env.GOOGLE_OAUTH_CLIENT_ID, env.GOOGLE_OAUTH_CLIENT_SECRET, redirect_uri);

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

  const body = await response.json();
  console.log("BODY", body);
  if (typeof body.id_token !== "string") {
    console.error("NO ID TOKEN");
  }

  // const decoded = jwt.decode(body.id_token, { complete: true });
  const decoded = jwt.decode(body.id_token, { complete: true });
  console.log("DECODED TOKEN: ", decoded);
  if (!decoded?.payload)
    return next([new SnowAuthError(ERROR_MESSAGES.CREDENTIALS.INVALID_OAUTH_ID_TOKEN, 401)]);
  // check that the nonce exists in the DB and delete it from the db once accepted
  // check that the nonce cookie matches the id token nonce
  //
  // make sure the user's email is verified by google
  // create the user and their credentials if they don't exist
  // create the user's session
  res.status(201).json({ alreadyRegistered: true }); // if not already registered, prompt for a username
  // the user's browser will handle redirecting them on success or showing an error if not

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

function getGoogleOauthRedirectURI() {
  const { OAUTH } = ROUTES;
  const productionGoogleRedirectURI = "https://roguelikeracing.com/auth";
  const devGoogleRedirectURI = "http://localhost:3000";
  const googleRedirectURIPath = appRoute(OAUTH.ROOT, OAUTH.GOOGLE);
  const baseRedirectURI =
    env.NODE_ENV === "production" ? productionGoogleRedirectURI : devGoogleRedirectURI;
  return baseRedirectURI + googleRedirectURIPath;
}

// client secret makes it so only our server can exchange authorization codes for id tokens
//
// state makes it so only the browser which started the oauth request can successfully present
// an authorization code
//
// an attacker can start an oauth flow and get a legit state linked to their own browser, and then
// use a stolen authorization code in their request to our server
//
// our server will then exchange the authorization code for the victim's token and check if the nonce
// inside the id_token matches the nonce in the presenting browser's cookie (which it won't)
//
//
interface GoogleIDTokenPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  at_hash: string;
  nonce: string;
  iat: number;
  exp: number;
}
