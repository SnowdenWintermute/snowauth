import { env } from "../utils/load-env-variables.js";
const protocol = env.NODE_ENV === "production" ? "https" : "http";

export const ACCOUNT_ACTIVATION_SUBJECT = "Activate your account";

export function buildAccountActivationHTML(websiteName: string, activationPageUrl: string) {
  const output = `
  <p>Account creation was initiated for user this email at ${websiteName}. Follow the link to activate your account.</p>
  <p>
      <a href="${protocol}://${activationPageUrl}" data-cy="activation-link">
          ${protocol}://${activationPageUrl}
      </a>
  </p>
  `;
  return output;
}

export function buildAccountActivationText(websiteName: string, activationPageUrl: string) {
  const output = `
  Account creation was initiated for this email at ${websiteName}. Follow the link to activate your account.
  \n \n
  ${protocol}://${activationPageUrl}  
  `;
  return output;
}
