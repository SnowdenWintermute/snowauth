import { env } from "../utils/load-env-variables.js";
const protocol = env.NODE_ENV === "production" ? "https" : "http";

export const ACCOUNT_ACTIVATION_SUBJECT = "Activate your account";
export const PASSWORD_RESET_SUBJECT = "Reset your password";

export function buildAccountActivationEmail(
  websiteName: string,
  activationPageUrl: string,
  isHtml: boolean
) {
  const text = `Account creation was initiated for user this email at ${websiteName}. Follow the link to activate your account.`;
  const htmlOutput = `
  <p>${text}</p>
  <p>
      <a href=${activationPageUrl} data-cy="activation-link">
          ${activationPageUrl}
      </a>
  </p>
  `;

  const textOutput = `
  ${text}
  \n \n
  ${activationPageUrl}
  `;

  return isHtml ? htmlOutput : textOutput;
}

export function buildPasswordResetEmail(websiteName: string, linkUrl: string, isHtml: boolean) {
  const text = `Someone (hopefully you) has requested a password reset for your account at ${websiteName}. Follow the link to reset your password.`;

  const htmlOutput = `
  <p>${text}</p>
  <p>
      <a href=${linkUrl} data-cy="activation-link">
          ${linkUrl}
      </a>
  </p>
  `;

  const textOutput = `
  ${text}
  \n \n
  ${linkUrl}
  `;

  return isHtml ? htmlOutput : textOutput;
}
