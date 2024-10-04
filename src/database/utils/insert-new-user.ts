import { credentialsRepo } from "../repos/credentials.js";
import { profilesRepo } from "../repos/profiles.js";
import { userIdsRepo } from "../repos/user-ids.js";

export default async function insertNewUser(
  email: string,
  hashedPasswordOption: null | string,
  username: string
) {
  const newUserIdRecord = await userIdsRepo.insert();
  await credentialsRepo.insert(newUserIdRecord.id, email, hashedPasswordOption);
  await profilesRepo.insert(newUserIdRecord.id, username);
  return newUserIdRecord;
}
