/** An error with optional associated field to display errors on form inputs */
export default class SnowAuthError extends Error {
  message: string;
  status: number;
  formField: string | undefined;
  constructor(message: string, status: number, field?: string) {
    super(message);
    this.message = message;
    this.status = status;
    this.formField = field;
  }
}

export type SnowAuthErrorDetails = { message: string; field?: string };
