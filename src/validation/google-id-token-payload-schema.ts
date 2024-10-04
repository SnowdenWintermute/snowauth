import { boolean, number, object, string, z } from "zod";

export const googleOAuthIDTokenPayloadSchema = object({
  iss: string(),
  azp: string(),
  aud: string(),
  sub: string(),
  email: string(),
  email_verified: boolean(),
  at_hash: string(),
  nonce: string(),
  iat: number(),
  exp: number(),
});

export type GoogleOAuthIDTokenPayloadSchema = z.infer<typeof googleOAuthIDTokenPayloadSchema>;

// interface GoogleIDTokenPayload {
//   iss: string;
//   azp: string;
//   aud: string;
//   sub: string;
//   email: string;
//   email_verified: boolean;
//   at_hash: string;
//   nonce: string;
//   iat: number;
//   exp: number;
// }
