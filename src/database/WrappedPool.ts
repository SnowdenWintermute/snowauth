import pg from "pg";

export default class WrappedPool {
  private _pool: pg.Pool | null = null;

  connect(options: pg.PoolConfig) {
    this._pool = new pg.Pool(options);
    this._pool.on("error", (error) => {
      console.error("Connection with Postgres failed!");
      console.error(error);
    });
    return this._pool.query("SELECT 1+1;");
  }

  close() {
    return this._pool?.end();
  }

  query(sql: any, params?: any): any {
    return this._pool?.query(sql, params);
  }
}
