import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../utils/load-env-variables.js";
import { ROUTES } from "../route-names.js";
import appRoute from "../utils/get-app-route-name.js";

export async function loginWithGoogleHandler(req: Request, res: Response, next: NextFunction) {
  // google ouath2 discovery document https://accounts.google.com/.well-known/openid-configuration
  // authorization_endpoint gives us:
  const googleOauth2BaseUri = "https://accounts.google.com/o/oauth2/v2/auth";
  // make a GET request including
  const client_id = env.GOOGLE_OAUTH_CLIENT_ID;
  const response_type = "code";
  const scope = "openid email";
  // state is an opaque string generated on our server that will be sent back to us so we
  // know the response is related to our request and not a forgery
  const state = crypto.randomBytes(16).toString("hex");
  // to prevent replay attacks, a number to be used once
  const nonce = crypto.randomBytes(16).toString("hex");
  const redirect_uri = getGoogleOauthRedirectURI();

  // Send the get request like so
  // we actually need to send this from the client
  const requestUri = `${googleOauth2BaseUri}?response_type=${response_type}&client_id=${client_id}&scope=${encodeURIComponent(
    scope
  )}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}&nonce=${nonce}`;

  res.status(201).send({ requestUri });
}

export async function googleOauthResponseHandler(req: Request, res: Response, next: NextFunction) {
  // google will POST to this endpoint
  // parse the query string from google
  // get a code
  // make a request to this address with the code
  // https://oauth2.googleapis.com/token
  const fullUrlString = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  const requestUrlObject = new URL(fullUrlString);
  const requestQueryParams = new URLSearchParams(requestUrlObject.search);
  const state = requestQueryParams.get("state");
  console.log("GOT STATE: ", state);
  // check if state param equals our saved state param
  // if(state !== savedState) error
  //
  const code = requestQueryParams.get("code");
  console.log("GOT CODE: ", code);
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
  res.redirect("/");
  // console.log("PARSED JSON RESPONSE", parsed);

  // make sure the user's email is verified by google

  // check that the nonce is the same one supplied and delete it from the db once accepted
  //
  // before using the id token in other services, they must validate it:
  // https://developers.google.com/identity/openid-connect/openid-connect#validatinganidtoken
  // but it is fine to use it here on the server because we know it came from google directly
}

function getGoogleOauthRedirectURI() {
  const { OAUTH } = ROUTES;
  const productionGoogleRedirectURI = "https://roguelikeracing.com/auth";
  const devGoogleRedirectURI = "http://localhost:8081";
  const googleRedirectURIPath = appRoute(OAUTH.ROOT, OAUTH.GOOGLE);
  const baseRedirectURI =
    env.NODE_ENV === "production" ? productionGoogleRedirectURI : devGoogleRedirectURI;
  return baseRedirectURI + googleRedirectURIPath;
}
