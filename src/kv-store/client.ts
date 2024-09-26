import { createClient, RedisClientType } from "redis";

const CONNECTION_TIMEOUT_MS = 3000;

export class ValkeyManager {
  valkeyClient: RedisClientType;
  connected: boolean = false;
  constructor() {
    this.valkeyClient = createClient({
      url: process.env.VALKEY_URL,
    });

    this.valkeyClient.on("connection", () => {
      console.log("valkey client connected");
      this.connected = true;
    });
    this.valkeyClient.on("disconnection", () => {
      console.log("valkey client disconnected");
      this.connected = false;
    });

    this.valkeyClient.on("error", (error) => {
      console.error(error);
    });
  }

  async connect() {
    this.valkeyClient.connect();
    const connectionAttemptStartedAt = Date.now();
    while (!this.connected) {
      const currentTime = Date.now();
      const elapsed = currentTime - connectionAttemptStartedAt;
      if (elapsed > CONNECTION_TIMEOUT_MS) {
        this.valkeyClient.disconnect();
        return console.error("connection to valkey timed out");
      }
      continue;
    }
  }
}

export const valkeyManager = new ValkeyManager();
