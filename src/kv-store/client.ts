import { createClient, RedisClientType } from "redis";
import { env } from "../utils/load-env-variables.js";

const CONNECTION_TIMEOUT_MS = 3000;

export class ValkeyManager {
  client: RedisClientType;
  connected: boolean = false;
  constructor() {
    console.log("connecting to valkey at ", env.VALKEY_URL);
    this.client = createClient({
      url: process.env.VALKEY_URL,
    });

    this.client.on("connect", () => {
      console.log("valkey client connected");
      this.connected = true;
    });
    this.client.on("disconnect", () => {
      console.log("valkey client disconnected");
      this.connected = false;
    });

    this.client.on("error", (error) => {
      console.error(error);
    });
  }

  async connect() {
    await this.client.connect();
    const connectionAttemptStartedAt = Date.now();
    while (!this.connected) {
      const currentTime = Date.now();
      const elapsed = currentTime - connectionAttemptStartedAt;
      if (elapsed > CONNECTION_TIMEOUT_MS) {
        this.client.disconnect();
        return console.error("connection to valkey timed out");
      }
      continue;
    }
  }
}

export const valkeyManager = new ValkeyManager();
