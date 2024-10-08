import * as dotenv from "dotenv";
dotenv.config();
import sgMail from "@sendgrid/mail";
import { pgOptions } from "./database/config.js";
import pgPool from "./database/instantiate-wrapped-pool.js";
import { valkeyManager } from "./kv-store/client.js";
import { env } from "./utils/load-env-variables.js";
import buildExpressApp from "./build-express-app.js";

const PORT = 8081;
sgMail.setApiKey(env.SENDGRID_API_KEY);
pgPool.connect(pgOptions);
valkeyManager.context.connect();

const expressApp = buildExpressApp();

expressApp.listen(PORT, () => {
  console.log(`snowauth server listening on port ${PORT}`);
});
