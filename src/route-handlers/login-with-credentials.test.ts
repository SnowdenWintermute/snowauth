import request, { Agent } from "supertest";
import { valkeyManager } from "../kv-store/client.js";
import PGTestingContext from "../utils/testing/pg-context.js";
import setUpTestDatabaseContexts from "../utils/testing/set-up-test-database-contexts.js";
import { ROUTES } from "../route-names.js";
import buildExpressApp from "../build-express-app.js";
import { Application } from "express";
import createTestUser from "../utils/testing/create-test-user.js";
import { responseBodyIncludesCustomErrorMessage } from "../utils/testing/custom-error-checkers.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";

jest.mock("../emails/send-email.js");

describe("loginWithCredentials", () => {
  const testId = Date.now().toString();
  let pgContext: PGTestingContext;
  let expressApp: Application;
  let agent: Agent;
  const existingUserEmail = "existing@email.com";
  const existingUserUsername = "existing";
  const existingUserPassword = "some password";
  const { SESSIONS, USERS } = ROUTES;

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

  it("allows an existing user to access a protected route after logging in with valid credentials", async () => {
    const loginResponse = await agent
      .post(SESSIONS)
      .send({ email: existingUserEmail, password: existingUserPassword, rememberMe: false });
    expect(loginResponse.status).toBe(201);

    const protectedResponse = await agent.get(USERS.ROOT + USERS.PROTECTED);
    expect(protectedResponse.status).toBe(200);
  });

  it("returns an error to a user attempting to log in with credentials if their credentials in the db don't include a password", async () => {
    const existingEmailWithNoPassword = "no@password.com";
    await createTestUser(existingEmailWithNoPassword, "no.password", null);

    const loginResponse = await agent
      .post(SESSIONS)
      .send({ email: existingEmailWithNoPassword, password: "some password", rememberMe: false });
    expect(loginResponse.status).toBe(401);
    expect(
      responseBodyIncludesCustomErrorMessage(loginResponse, ERROR_MESSAGES.CREDENTIALS.INVALID)
    );

    const protectedResponse = await agent.get(USERS.ROOT + USERS.PROTECTED);
    expect(protectedResponse.status).toBe(401);
  });

  it("returns an error to a user attempting to log in with invalid password", async () => {
    const loginResponse = await agent.post(SESSIONS).send({
      email: existingUserEmail,
      password: existingUserPassword + "invalid",
      rememberMe: false,
    });
    expect(loginResponse.status).toBe(401);
    expect(
      responseBodyIncludesCustomErrorMessage(loginResponse, ERROR_MESSAGES.CREDENTIALS.INVALID)
    );

    const protectedResponse = await agent.get(USERS.ROOT + USERS.PROTECTED);
    expect(protectedResponse.status).toBe(401);
  });

  it("returns an error to a user attempting to log in if the provided email doesn't exist", async () => {
    const loginResponse = await agent.post(SESSIONS).send({
      email: existingUserEmail + "invalid",
      password: existingUserPassword,
      rememberMe: false,
    });
    expect(loginResponse.status).toBe(401);
    expect(
      responseBodyIncludesCustomErrorMessage(loginResponse, ERROR_MESSAGES.USER.DOES_NOT_EXIST)
    );

    const protectedResponse = await agent.get(USERS.ROOT + USERS.PROTECTED);
    expect(protectedResponse.status).toBe(401);
  });
});
