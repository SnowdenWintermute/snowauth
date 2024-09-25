import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import WrappedPool from "./database/WrappedPool.js";
import { pgOptions } from "./database/config.js";

const PORT = 8081;
const pgConnectionPool = new WrappedPool();
await pgConnectionPool.connect(pgOptions);
console.log("pg connected");

const app = express();

app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
