import format from "pg-format";
import pgPool from "../instantiate-wrapped-pool.js";
import { RESOURCE_NAMES } from "../db-consts.js";
import toCamelCase from "../../utils/to-camel-case.js";
import { DatabaseRepository } from "./index.js";

export type Profile = {
  id: number;
  userId: number;
  createdAt: number | Date;
  updatedAt: number | Date;
  username: null | string;
  usernameUpdatedAt: number | Date;
  role: string;
  status: string;
  banExpiresAt: null | number | Date;
};

const tableName = RESOURCE_NAMES.USER_PROFILES;

class ProfileRepo extends DatabaseRepository<Profile> {
  async insert(userId: number, username: null | string) {
    const { rows } = await this.pgPool.query(
      format(
        `INSERT INTO ${tableName} (user_id, username) VALUES (%L, %L, %L) RETURNING *;`,
        userId,
        username
      )
    );

    if (rows[0]) return toCamelCase(rows)[0] as unknown as Profile;
    return undefined;
  }

  async update(profile: Profile) {
    const { id, username, role, status, banExpiresAt } = profile;
    const { rows } = await this.pgPool.query(
      format(
        `UPDATE ${tableName} SET username = %L, role = %L, status = %L, ban_expires_at = %L WHERE id = %L RETURNING *;`,
        username,
        role,
        status,
        banExpiresAt,
        id
      )
    );

    if (rows[0]) return toCamelCase(rows)[0] as unknown as Profile;
    return undefined;
  }
}

export const profilesRepo = new ProfileRepo(pgPool, RESOURCE_NAMES.USER_PROFILES);
