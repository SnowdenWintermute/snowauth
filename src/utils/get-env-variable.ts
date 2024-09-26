import { ERROR_MESSAGES } from "../errors/error-messages.js";

export default function getEnvVariable(variableName: string): Error | string {
  const variableOption = process.env[variableName];
  if (!variableOption) {
    const error = new Error(ERROR_MESSAGES.MISSING_ENV_DATA(variableName));
    console.error(error);
    return error;
  }
  return variableOption;
}
