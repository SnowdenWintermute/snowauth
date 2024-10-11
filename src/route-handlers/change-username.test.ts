import { Application } from "express";
import request, { Agent } from "supertest";
import { valkeyManager } from "../kv-store/client.js";
import PGTestingContext from "../utils/testing/pg-context.js";
import setUpTestDatabaseContexts from "../utils/testing/set-up-test-database-contexts.js";
import buildExpressApp from "../build-express-app.js";
import { ROUTES } from "../route-names.js";
import createTestUser from "../utils/testing/create-test-user.js";
import {
  responseBodyIncludesCustomErrorField,
  responseBodyIncludesCustomErrorMessage,
} from "../utils/testing/custom-error-checkers.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";

describe("changeUsernameHandler", () => {
  const testId = Date.now().toString();
  let pgContext: PGTestingContext;
  let expressApp: Application;
  let agent: Agent;
  const existingUserEmail = "existing@email.com";
  const existingUserName = "some username";
  const existingUserPassword = "some password";
  const validUnusedNewUsername = "some new username";

  const { SESSIONS, USERS } = ROUTES;

  beforeAll(async () => {
    pgContext = await setUpTestDatabaseContexts(testId);
    expressApp = buildExpressApp();
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

  it("denies changing a username if not logged in", async () => {
    const changeUsernameResponse = await agent
      .put(USERS.ROOT + USERS.USERNAMES)
      .send({ newUsername: validUnusedNewUsername });
    expect(changeUsernameResponse.status).toBe(401);
  });
  it("denies changing a username to an existing username", async () => {
    await agent.post(SESSIONS).send({ email: existingUserEmail, password: existingUserPassword });

    const changeUsernameResponse = await agent
      .put(USERS.ROOT + USERS.USERNAMES)
      .send({ newUsername: existingUserName });
    expect(changeUsernameResponse.status).toBe(400);
    expect(
      responseBodyIncludesCustomErrorMessage(
        changeUsernameResponse,
        ERROR_MESSAGES.USER.NAME_IN_USE_OR_UNAVAILABLE
      )
    ).toBeTruthy();
  });
  it(`returns the new username when getting session after changing a username
      to an unused username when logged in`, async () => {
    await agent.post(SESSIONS).send({ email: existingUserEmail, password: existingUserPassword });

    const changeUsernameResponse = await agent
      .put(USERS.ROOT + USERS.USERNAMES)
      .send({ newUsername: validUnusedNewUsername });
    expect(changeUsernameResponse.status).toBe(201);

    expect(changeUsernameResponse.body["newUsername"]).toBe(validUnusedNewUsername);

    const getSessionResponse = await agent.get(SESSIONS);
    expect(getSessionResponse.body["username"]).toBe(validUnusedNewUsername);
  });
});
