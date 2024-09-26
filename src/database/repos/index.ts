import format from "pg-format";
import WrappedPool from "../WrappedPool.js";
import toCamelCase from "../../utils/to-camel-case.js";

export interface DataTypesForInsert {
  [columnName: string]: any;
}

export class DatabaseRepository<T> {
  constructor(
    public pgPool: WrappedPool,
    public tableName: string
  ) {}

  async findOne(field: keyof T, value: any): Promise<undefined | T> {
    const { rows } = await this.pgPool.query(
      format(`SELECT * FROM ${this.tableName} WHERE %I = %L;`, field, value)
    );
    if (rows[0]) return toCamelCase(rows)[0] as unknown as T;
    return undefined;
  }

  async findById(id: number): Promise<undefined | T> {
    const result = await this.pgPool.query(`SELECT * FROM ${this.tableName} WHERE id = $1;`, [id]);
    const { rows } = result;
    if (rows[0]) return toCamelCase(rows)[0] as unknown as T;
    return undefined;
  }

  async delete(id: number) {
    const { rows } = await this.pgPool.query(
      `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *;`,
      [id]
    );
    if (rows[0]) return toCamelCase(rows)[0] as unknown as T;
    return undefined;
  }

  async count() {
    const { rows } = await this.pgPool.query(`SELECT COUNT(*) FROM ${this.tableName};`);
    return parseInt(rows[0].count, 10);
  }
}
