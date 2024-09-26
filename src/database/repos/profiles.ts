import format from "pg-format";
import pgPool from "../instantiate-wrapped-pool.js";
import { RESOURCE_NAMES } from "../db-consts.js";
import toCamelCase from "../../utils/to-camel-case.js";

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

export default class ProfileRepo {
  static async findOne(field: keyof Profile, value: any): Promise<Profile> {
    const { rows } = await pgPool.query(
      format(`SELECT * FROM ${tableName} WHERE %I = %L;`, field, value)
    );
    return toCamelCase(rows)[0] as unknown as Profile;
  }

  static async findById(id: number): Promise<Profile | undefined> {
    const result = await pgPool.query(`SELECT * FROM ${tableName} WHERE id = $1;`, [id]);
    if (!result) return undefined;
    const { rows } = result;
    if (rows[0]) return toCamelCase(rows)[0] as unknown as Profile;
  }

  static async insert(userId: number, username: null | string) {
    const { rows } = await pgPool.query(
      format(
        `INSERT INTO ${tableName} (user_id, username) VALUES (%L, %L, %L) RETURNING *;`,
        userId,
        username
      )
    );
    return toCamelCase(rows)[0] as unknown as Profile;
  }

  static async update(profile: Profile) {
    const { id, username, role, status, banExpiresAt } = profile;
    const { rows } = await pgPool.query(
      format(
        `UPDATE ${tableName} SET username = %L, role = %L, status = %L, ban_expires_at = %L WHERE id = %L RETURNING *;`,
        username,
        role,
        status,
        banExpiresAt,
        id
      )
    );
    return toCamelCase(rows)![0] as unknown as Profile;
  }

  static async delete(id: number) {
    const { rows } = await pgPool.query(`DELETE FROM ${tableName} WHERE id = $1 RETURNING *;`, [
      id,
    ]);
    return toCamelCase(rows)![0] as unknown as Profile;
  }

  static async count() {
    const { rows } = await pgPool.query(`SELECT COUNT(*) FROM ${tableName};`);
    return parseInt(rows[0].count, 10);
  }
}
