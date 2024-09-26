import format from "pg-format";
import pgPool from "../instantiate-wrapped-pool.js";
import { RESOURCE_NAMES } from "../db-consts.js";
import toCamelCase from "../../utils/to-camel-case.js";

export type Credentials = {
  id: number;
  userId: number;
  createdAt: number | Date;
  updatedAt: number | Date;
  emailAddress: string;
  emailAddressUpdatedAt: number | Date;
  password: null | string;
  passwordUpdatedAt: null | number | Date;
};

const tableName = RESOURCE_NAMES.CREDENTIALS;

export default class CredentialsRepo {
  static async findOne(field: keyof Credentials, value: any): Promise<Credentials> {
    const { rows } = await pgPool.query(
      format(`SELECT * FROM ${tableName} WHERE %I = %L;`, field, value)
    );
    return toCamelCase(rows)[0] as unknown as Credentials;
  }

  static async findById(id: number): Promise<Credentials | undefined> {
    const result = await pgPool.query(`SELECT * FROM ${tableName} WHERE id = $1;`, [id]);
    if (!result) return undefined;
    const { rows } = result;
    if (rows[0]) return toCamelCase(rows)[0] as unknown as Credentials;
  }

  static async insert(userId: number, emailAddress: string, password: null | string) {
    const { rows } = await pgPool.query(
      format(
        `INSERT INTO ${tableName} (user_id, email_address, password) VALUES (%L, %L, %L) RETURNING *;`,
        userId,
        emailAddress.toLowerCase().trim(),
        password
      )
    );
    return toCamelCase(rows)[0] as unknown as Credentials;
  }

  static async delete(id: number) {
    const { rows } = await pgPool.query(
      `DELETE FROM ${RESOURCE_NAMES.USERS} WHERE id = $1 RETURNING *;`,
      [id]
    );
    return toCamelCase(rows)![0] as unknown as Credentials;
  }

  static async count() {
    const { rows } = await pgPool.query(`SELECT COUNT(*) FROM ${tableName};`);
    return parseInt(rows[0].count, 10);
  }
}
