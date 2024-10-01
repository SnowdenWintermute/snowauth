import { ARGON2_OPTIONS } from "../../config.js";
import { credentialsRepo } from "../../database/repos/credentials.js";
import { profilesRepo } from "../../database/repos/profiles.js";
import { userIdsRepo } from "../../database/repos/user-ids.js";
import * as argon2 from "argon2";

export default async function createTestUser(
  email: string,
  username: null | string = null,
  passwordOption: null | string = null
) {
  const userIdRecord = await userIdsRepo.insert();
  if (passwordOption) passwordOption = await argon2.hash(passwordOption, ARGON2_OPTIONS);
  await credentialsRepo.insert(userIdRecord.id, email, passwordOption);
  await profilesRepo.insert(userIdRecord.id, username);
  return userIdRecord;
}
