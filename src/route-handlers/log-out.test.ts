import request, { Agent } from "supertest";
import { valkeyManager } from "../kv-store/client.js";
import PGTestingContext from "../utils/testing/pg-context.js";
import setUpTestDatabaseContexts from "../utils/testing/set-up-test-database-contexts.js";
import { ROUTES } from "../route-names.js";
import { responseBodyIncludesCustomErrorMessage } from "../utils/testing/custom-error-checkers.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import buildExpressApp from "../build-express-app.js";
import { Application } from "express";
import createTestUser from "../utils/testing/create-test-user.js";

describe("logOutHandler", () => {
  const testId = Date.now().toString();
  let pgContext: PGTestingContext;
  let expressApp: Application;
  let agent: Agent;
  const existingUserEmail = "existing@email.com";
  const existingUserName = "some username";
  const existingUserPassword = "some password";

  const { SESSIONS, USERS } = ROUTES;

  beforeAll(async () => {
    pgContext = await setUpTestDatabaseContexts(testId);
    expressApp = buildExpressApp();
    // set up an existing user
    await createTestUser(existingUserEmail, existingUserName, existingUserPassword);
  });

  beforeEach(async () => {
    await valkeyManager.context.removeAllKeys();
    agent = request.agent(expressApp);
  });

  afterAll(async () => {
    await pgContext.cleanup();
    await valkeyManager.context.cleanup();
  });

  it("doesn't allow access to protected resources after logging out", async () => {
    await agent
      .post(SESSIONS)
      .send({ email: existingUserEmail, password: existingUserPassword, rememberMe: true });

    const logoutResponse = await agent.delete(SESSIONS);
    expect(logoutResponse.status).toBe(200);

    const protectedResponse = await agent.get(USERS.ROOT + USERS.PROTECTED);
    expect(protectedResponse.status).toBe(401);
    expect(
      responseBodyIncludesCustomErrorMessage(
        protectedResponse,
        ERROR_MESSAGES.SESSION.NOT_LOGGED_IN
      )
    );
  });
});
