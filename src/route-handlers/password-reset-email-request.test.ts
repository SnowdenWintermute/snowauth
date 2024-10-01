import request, { Agent } from "supertest";
import { valkeyManager } from "../kv-store/client.js";
import PGTestingContext from "../utils/testing/pg-context.js";
import setUpTestDatabaseContexts from "../utils/testing/set-up-test-database-contexts.js";
import { ROUTES } from "../route-names.js";
import buildExpressApp from "../build-express-app.js";
import { Application } from "express";
import createTestUser from "../utils/testing/create-test-user.js";
import { sendEmail } from "../emails/send-email.js";
import { responseBodyIncludesCustomErrorMessage } from "../utils/testing/custom-error-checkers.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";

jest.mock("../emails/send-email.js");

describe("requestPasswordResetEmailHandler", () => {
  const testId = Date.now().toString();
  let pgContext: PGTestingContext;
  let expressApp: Application;
  let agent: Agent;
  const existingUserEmail = "existing@email.com";
  const existingUserUsername = "existing";
  const existingUserPassword = "some password";
  const { CREDENTIALS } = ROUTES;

  beforeAll(async () => {
    pgContext = await setUpTestDatabaseContexts(testId);
    expressApp = buildExpressApp();
    // set up an existing user
    await createTestUser(existingUserEmail, existingUserUsername, existingUserPassword);
  });

  beforeEach(async () => {
    await valkeyManager.context.removeAllKeys();
    agent = request.agent(expressApp);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await pgContext.cleanup();
    await valkeyManager.context.cleanup();
  });

  it("sends an email upon request", async () => {
    const passwordResetResponse = await agent.post(CREDENTIALS.ROOT).send({
      email: existingUserEmail,
      websiteName: "website.com",
      resetPageUrl: "http://website.com/password-reset/token",
    });

    expect(passwordResetResponse.status).toBe(200);
    expect(sendEmail).toHaveBeenCalled();
  });

  it("doesn't send an email if the provided address doesn't exist in the db", async () => {
    const passwordResetResponse = await agent.post(CREDENTIALS.ROOT).send({
      email: "not@in.the.db.com",
      websiteName: "website.com",
      resetPageUrl: "http://website.com/password-reset/token",
    });

    expect(passwordResetResponse.status).toBe(404);
    expect(
      responseBodyIncludesCustomErrorMessage(
        passwordResetResponse,
        ERROR_MESSAGES.USER.EMAIL_DOES_NOT_EXIST
      )
    );
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
