import { PASSWORD_LENGTH, USERNAME_LENGTH } from "../validation/config.js";

export const ERROR_MESSAGES = {
  MISSING_ENV_DATA: (dataName: string) => `Missing environment data: ${dataName}`,
  SERVER_GENERIC: "Internal server error",
  RATE_LIMITER: {
    REQUESTING_TOO_QUICKLY:
      "You are sending requests too quickly, please wait a while before trying again",
    TOO_MANY_REQUESTS:
      "You have sent too many requests recently, please wait a while before trying again",
    TOO_MANY_FAILED_LOGINS:
      "You have failed too many login attempts and your account has been locked, please reset your password to regain access",
  },
  CREDENTIALS: {
    INVALID: "Incorrect email or password",
    INVALID_WITH_ATTEMPTS_REMAINING: (remaining: number) => {
      if (remaining === 0)
        return `Incorrect email or password, this is your final attempt before account will be locked`;
      return `Incorrect email or password, you have ${remaining} attempts remaining`;
    },
    ROLE_RESTRICTED: "That action is role restricted",
    EMAIL_IN_USE_OR_UNAVAILABLE: "The specified email is already in use or is unavailable",
    CHANGE_PASSWORD_EMAIL: "Error trying to send password reset email",
    CHANGE_PASSWORD_TOKEN:
      "No token provided - use the link in your email to get a page with a token",
    PASSWORD_RESET_EMAIL_DOES_NOT_MATCH_TOKEN:
      "The provided email address did not match with the password reset token",
  },
  SESSION: {
    NOT_LOGGED_IN: "You are not logged in",
    INVALID_OR_EXPIRED_TOKEN: "Invalid or expired token",
    EXPIRED: "User session has expired, please log in again",
    USED_OR_EXPIRED_ACCOUNT_CREATION_SESSION:
      "Either you have already created an account with this token or it has been too long since you initiated account creation, please try registering again to get a new account activation email",
  },
  USER: {
    DOES_NOT_EXIST: "The specified user does not exist",
    EMAIL_DOES_NOT_EXIST: "No user with that email exists",
    NAME_IN_USE_OR_UNAVAILABLE: "The specified name is already in use or is unavailable",
    ACCOUNT_DELETION: "An error occurred when trying to delete your account",
    ACCOUNT_BANNED: "The specified account has been banned",
    ACCOUNT_LOCKED:
      "Your account has been locked for security reasons, please reset your password to regain access",
  },
  ADMIN: {
    NO_IP_TO_BAN: "No IP address was found",
  },
  VALIDATION: {
    REQUIRED_FIELD: {
      NAME: "A name is required",
      EMAIL: "An email address is required",
      PASSWORD: "Please enter a password",
      PASSWORD_CONFIRMATION: "Please confirm your password",
    },
    CONFIRM_DELETE_ACCOUNT_EMAIL_MATCH: "Email address typed did not match your account's email",
    INVALID_EMAIL: "Invalid email",
    PASSWORD_MIN_LENGTH: `Password must be at least ${PASSWORD_LENGTH.MIN} characters`,
    PASSWORD_MAX_LENGTH: `Password must be no longer than ${PASSWORD_LENGTH.MAX} characters`,
    PASSWORDS_DONT_MATCH: "Password confirmation does not match the password",
    USERNAME_MIN_LENGTH: `Name must be at least ${USERNAME_LENGTH.MIN} characters`,
    USERNAME_MAX_LENGTH: `Name must be no longer than ${USERNAME_LENGTH.MIN} characters`,
  },
};