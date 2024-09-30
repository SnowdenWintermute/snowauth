import format from "pg-format";
import pgPool from "../instantiate-wrapped-pool.js";
import { RESOURCE_NAMES } from "../db-consts.js";
import toCamelCase from "../../utils/to-camel-case.js";
import { DatabaseRepository } from "./index.js";

export type SessionSeries = {
  id: string;
  userId: number;
  createdAt: number | Date;
  updatedAt: number | Date;
  hashedToken: null | string;
};

const tableName = RESOURCE_NAMES.SESSION_SERIES;

class SessionSeriesRepo extends DatabaseRepository<SessionSeries> {
  async insert(id: string, userId: number, hashedToken: string) {
    const { rows } = await this.pgPool.query(
      format(
        `INSERT INTO ${tableName} (id, user_id, hashed_token) VALUES (%L, %L, decode(%L, \'hex\')) RETURNING *;`,
        id,
        userId,
        hashedToken
      )
    );

    if (rows[0]) return toCamelCase(rows)[0] as unknown as SessionSeries;
    console.error(`Failed to insert a new ${tableName} record`);
    return undefined;
  }

  async findById(id: string): Promise<SessionSeries | undefined> {
    const result = await this.pgPool.query(
      format(
        `SELECT *, encode(hashed_token, \'hex\') as hashed_token FROM ${tableName} WHERE id = %L;`,
        id
      )
    );
    const { rows } = result;
    if (rows[0]) return toCamelCase(rows)[0] as unknown as SessionSeries;
    return undefined;
  }

  async updateToken(id: string, token: string) {
    const { rows } = await this.pgPool.query(
      format(
        `UPDATE ${tableName} SET hashed_token = decode(%L, \'hex\') WHERE id = %L RETURNING *;`,
        token,
        id
      )
    );

    if (rows[0]) return toCamelCase(rows)[0] as unknown as SessionSeries;
    return undefined;
  }
}

export const sessionSeriesRepo = new SessionSeriesRepo(pgPool, RESOURCE_NAMES.USER_PROFILES);
