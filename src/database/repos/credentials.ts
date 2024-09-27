import format from "pg-format";
import pgPool from "../instantiate-wrapped-pool.js";
import { RESOURCE_NAMES } from "../db-consts.js";
import toCamelCase from "../../utils/to-camel-case.js";
import { DatabaseRepository } from "./index.js";

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

class CredentialsRepo extends DatabaseRepository<Credentials> {
  async insert(userId: number, emailAddress: string, password: null | string) {
    const { rows } = await this.pgPool.query(
      format(
        `INSERT INTO ${tableName} (user_id, email_address, password) VALUES (%L, %L, %L) RETURNING *;`,
        userId,
        emailAddress.toLowerCase().trim(),
        password
      )
    );

    if (rows[0]) return toCamelCase(rows)[0] as unknown as Credentials;
    console.error(`Failed to insert a new ${tableName} record`);
    return undefined;
  }

  async update(credentials: Credentials) {
    const { id, emailAddress, password } = credentials;
    const { rows } = await this.pgPool.query(
      format(
        `UPDATE ${RESOURCE_NAMES.CREDENTIALS} SET email_address = %L, password = %L WHERE id = %L RETURNING *;`,
        emailAddress.toLowerCase().trim(),
        password,
        id
      )
    );

    if (rows[0]) return toCamelCase(rows)[0] as unknown as Credentials;
    return undefined;
  }

  async updatePassword(id: number, newPassword: string) {
    const { rows } = await this.pgPool.query(
      format(
        `UPDATE ${RESOURCE_NAMES.CREDENTIALS} SET password = %L WHERE id = %L RETURNING *;`,
        newPassword,
        id
      )
    );

    if (rows[0]) return toCamelCase(rows)[0] as unknown as Credentials;
    return undefined;
  }
}

export const credentialsRepo = new CredentialsRepo(pgPool, RESOURCE_NAMES.CREDENTIALS);
