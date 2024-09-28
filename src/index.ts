import * as dotenv from "dotenv";
dotenv.config();
import sgMail from "@sendgrid/mail";
import { pgOptions } from "./database/config.js";
import pgPool from "./database/instantiate-wrapped-pool.js";
import { valkeyManager } from "./kv-store/client.js";
import { env } from "./utils/load-env-variables.js";
import buildExpressApp from "./buildExpressApp.js";

const PORT = 8081;
sgMail.setApiKey(env.SENDGRID_API_KEY);
pgPool.connect(pgOptions);
valkeyManager.context.connect();

const expressApp = buildExpressApp();

expressApp.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
