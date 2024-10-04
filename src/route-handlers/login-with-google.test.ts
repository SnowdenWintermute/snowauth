import request, { Agent } from "supertest";
import { valkeyManager } from "../kv-store/client.js";
import PGTestingContext from "../utils/testing/pg-context.js";
import setUpTestDatabaseContexts from "../utils/testing/set-up-test-database-contexts.js";
import { ROUTES } from "../route-names.js";
import buildExpressApp from "../build-express-app.js";
import { Application } from "express";
import createTestUser from "../utils/testing/create-test-user.js";

describe("loginWithGoogle", () => {
  const testId = Date.now().toString();
  let pgContext: PGTestingContext;
  let expressApp: Application;
  let agent: Agent;
  const existingUserEmail = "existing@email.com";
  const existingUserUsername = "existing";
  const existingUserPassword = "some password";
  const { SESSIONS, USERS, CREDENTIALS } = ROUTES;

  beforeAll(async () => {
    pgContext = await setUpTestDatabaseContexts(testId);
    expressApp = buildExpressApp();
    // set up an existing user
    await createTestUser(existingUserEmail, existingUserUsername, existingUserPassword);
  });

  beforeEach(async () => {
    await valkeyManager.context.removeAllKeys();
    agent = request.agent(expressApp);
  });

  afterAll(async () => {
    await pgContext.cleanup();
    await valkeyManager.context.cleanup();
  });

  it("empty", async () => {});
});
