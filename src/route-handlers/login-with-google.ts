import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../utils/load-env-variables.js";
import { ROUTES } from "../route-names.js";

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
  const requestUri = `
  ${googleOauth2BaseUri}?
    response_type=${response_type}&
    client_id=${client_id}&
    scope=${encodeURIComponent(scope)}&
    redirect_uri=${encodeURIComponent(redirect_uri)}&
    state=${state}&
    nonce=${nonce}&
  `;

  const codeRequestResponse = await fetch(requestUri, {
    method: "GET",
  });
  res.sendStatus(codeRequestResponse.status);
}

export async function googleOauthResponseHandler(req: Request, res: Response, next: NextFunction) {
  // example url
  // https://oauth2.example.com/code?state=security_token%3D138r5719ru3e1%26url%3Dhttps%3A%2F%2Foa2cb.example.com%2FmyHome&code=4/P7q7W91a-oMsCeLvIaQm6bTrgtp7&scope=openid%20email%20https://www.googleapis.com/auth/userinfo.email
  // parse the query string
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

  const response = await fetch(token_endpoint, {
    method: "POST",
    body: JSON.stringify({
      code,
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: encodeURIComponent(redirect_uri),
      grant_type: "authorization_code",
    }),
  });

  const body = await response.json();
  const parsed = JSON.parse(body);
  console.log("PARSED JSON RESPONSE", parsed);

  // check that the nonce is the same one supplied and delete it from the db once accepted
  //
  // before using the id token in other services, they must validate it:
  // https://developers.google.com/identity/openid-connect/openid-connect#validatinganidtoken
  // but it is fine to use it here on the server because we know it came from google directly
}

function getGoogleOauthRedirectURI() {
  const { CREDENTIALS } = ROUTES;
  const productionGoogleRedirectURI = "https://roguelikeracing.com/auth";
  const devGoogleRedirectURI = "http://localhost:8081";
  const googleRedirectURIPath = CREDENTIALS.GOOGLE;
  const baseRedirectURI =
    env.NODE_ENV === "production" ? productionGoogleRedirectURI : devGoogleRedirectURI;
  return baseRedirectURI + googleRedirectURIPath;
}
