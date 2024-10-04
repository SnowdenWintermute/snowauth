import * as argon2 from "argon2";
import { ARGON2_OPTIONS } from "../../config.js";
import insertNewUser from "../../database/utils/insert-new-user.js";

export default async function createTestUser(
  email: string,
  username: string,
  passwordOption: null | string = null
) {
  if (passwordOption) passwordOption = await argon2.hash(passwordOption, ARGON2_OPTIONS);
  return await insertNewUser(email, passwordOption, username);
}
