import { Application } from "express";
import request, { Agent } from "supertest";
import { valkeyManager } from "../kv-store/client.js";
import PGTestingContext from "../utils/testing/pg-context.js";
import setUpTestDatabaseContexts from "../utils/testing/set-up-test-database-contexts.js";
import buildExpressApp from "../build-express-app.js";
import { ROUTES } from "../route-names.js";
import createTestUser from "../utils/testing/create-test-user.js";
import { responseBodyIncludesCustomErrorMessage } from "../utils/testing/custom-error-checkers.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { sendEmail } from "../emails/send-email.js";

jest.mock("../emails/send-email.js");

describe("deleteAccountHandler", () => {
  const testId = Date.now().toString();
  let pgContext: PGTestingContext;
  let expressApp: Application;
  let agent: Agent;
  const existingUserEmail = "existing@email.com";
  const existingUserName = "some username";
  const existingUserPassword = "some password";

  const { SESSIONS, USERS, CREDENTIALS } = ROUTES;

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

  it("denies a user deleting their account when not logged in", async () => {
    const deleteResponse = await agent.delete(USERS.ROOT);
    expect(deleteResponse.status).toBe(401);

    const loginResponse = await agent
      .post(SESSIONS)
      .send({ email: existingUserEmail, password: existingUserPassword });
    expect(loginResponse.status).toBe(201);
  });

  it("denies a user deleting their account without sending the confirmation boolean", async () => {
    const loginResponse = await agent
      .post(SESSIONS)
      .send({ email: existingUserEmail, password: existingUserPassword });
    expect(loginResponse.status).toBe(201);

    const deleteResponse = await agent.delete(USERS.ROOT);
    expect(deleteResponse.status).toBe(400);
    expect(
      responseBodyIncludesCustomErrorMessage(
        deleteResponse,
        ERROR_MESSAGES.VALIDATION.DELETE_CONFIRMATION_NOT_CHECKED
      )
    );

    const loginAfterAttemptedDeleteResponse = await agent
      .post(SESSIONS)
      .send({ email: existingUserEmail, password: existingUserPassword });
    expect(loginAfterAttemptedDeleteResponse.status).toBe(201);
  });

  it(`doesn't let a user log in after deleting their account 
     and allows an account to be reregistered after deletion`, async () => {
    const loginResponse = await agent
      .post(SESSIONS)
      .send({ email: existingUserEmail, password: existingUserPassword });
    expect(loginResponse.status).toBe(201);

    const deleteResponse = await agent.delete(USERS.ROOT).send({ confirmDeletion: true });
    expect(deleteResponse.status).toBe(200);

    const loginAfterDeleteResponse = await agent
      .post(SESSIONS)
      .send({ email: existingUserEmail, password: existingUserPassword });
    expect(loginAfterDeleteResponse.status).toBe(401);

    const accountCreationResponse = await request(expressApp).post(ROUTES.USERS.ROOT).send({
      email: existingUserEmail,
      websiteName: "test",
      activationPageUrl: "http://test.com",
    });

    expect(accountCreationResponse.status).toBe(201);
    expect(sendEmail).toHaveBeenCalled();
  });
});
