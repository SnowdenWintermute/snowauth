import format from "pg-format";
import pgPool from "../instantiate-wrapped-pool.js";
import { RESOURCE_NAMES } from "../db-consts.js";
import toCamelCase from "../../utils/to-camel-case.js";
import { DatabaseRepository } from "./index.js";

export type UserIdRecord = {
  id: number;
  createdAt: number | Date;
  updatedAt: number | Date;
};

class UserIdsRepo extends DatabaseRepository<UserIdRecord> {
  async insert() {
    const { rows } = await pgPool.query(
      format(`INSERT INTO ${this.tableName} DEFAULT VALUES RETURNING *;`)
    );
    return toCamelCase(rows)[0] as unknown as UserIdRecord;
  }
}

export const userIdsRepo = new UserIdsRepo(pgPool, RESOURCE_NAMES.USER_IDS);

//export default class UsersRepo {
//  static async findById(id: number): Promise<User | undefined> {
//    const result = await pgPool.query(`SELECT * FROM ${tableName} WHERE id = $1;`, [id]);
//    if (!result) return undefined;
//    const { rows } = result;
//    if (rows[0]) return toCamelCase(rows)[0] as unknown as User;
//  }
//
//  static async insert() {
//    const { rows } = await pgPool.query(format(`INSERT INTO ${tableName} *;`));
//    return toCamelCase(rows)[0] as unknown as User;
//  }
//
//  static async delete(id: number) {
//    const { rows } = await pgPool.query(`DELETE FROM ${tableName} WHERE id = $1 RETURNING *;`, [
//      id,
//    ]);
//    return toCamelCase(rows)![0] as unknown as User;
//  }
//
//  static async count() {
//    const { rows } = await pgPool.query(`SELECT COUNT(*) FROM ${tableName};`);
//    return parseInt(rows[0].count, 10);
//  }
//}
