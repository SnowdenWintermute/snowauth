import { Application } from "express";
import request, { Agent } from "supertest";
import { valkeyManager } from "../kv-store/client.js";
import PGTestingContext from "../utils/testing/pg-context.js";
import setUpTestDatabaseContexts from "../utils/testing/set-up-test-database-contexts.js";
import buildExpressApp from "../build-express-app.js";
import { ROUTES } from "../route-names.js";
import createTestUser from "../utils/testing/create-test-user.js";
import appRoute from "../utils/get-app-route-name.js";
import { env } from "../utils/load-env-variables.js";

describe("getUserIdsFromUsernamesHandler", () => {
  const testId = Date.now().toString();
  let pgContext: PGTestingContext;
  let expressApp: Application;
  let agent: Agent;
  const existingUserEmail = "existing@email.com";
  const existingUserName = "some username";
  const existingUserPassword = "some password";

  const anotherUsername = "another username";

  const { USERS, INTERNAL } = ROUTES;

  beforeAll(async () => {
    pgContext = await setUpTestDatabaseContexts(testId);
    expressApp = buildExpressApp();
    await createTestUser(existingUserEmail, existingUserName, existingUserPassword);
    await createTestUser("another@email.com", "another username", "the strongest password 123");
  });

  beforeEach(async () => {
    await valkeyManager.context.removeAllKeys();
    agent = request.agent(expressApp);
  });

  afterAll(async () => {
    await pgContext.cleanup();
    await valkeyManager.context.cleanup();
  });

  it("sends the correct response", async () => {
    const response = await agent
      .get(appRoute(INTERNAL, USERS.IDS))
      .query(`usernames=${existingUserName},${anotherUsername}`)
      .set("Cookie", `internal=${env.INTERNAL_SERVICES_SECRET}`);
    console.log("response: ", response.body);
  });
});
