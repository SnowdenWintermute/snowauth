import request from "supertest";
import { valkeyManager } from "../kv-store/client.js";
import PGTestingContext from "../utils/testing/pg-context.js";
import setUpTestDatabaseContexts from "../utils/testing/set-up-test-database-contexts.js";
import { sendEmail } from "../emails/send-email.js";
import { credentialsRepo } from "../database/repos/credentials.js";
import { userIdsRepo } from "../database/repos/user-ids.js";
import { ROUTES } from "../route-names.js";
import { responseBodyIncludesCustomErrorMessage } from "../utils/testing/custom-error-checkers.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import buildExpressApp from "../build-express-app.js";
import { Application } from "express";

jest.mock("../emails/send-email.js");

describe("accountCreationHandler", () => {
  const testId = Date.now().toString();
  let pgContext: PGTestingContext;
  let expressApp: Application;
  const existingUserEmail = "existing@email.com";
  const existingUserEmailWithNoPassword = "existing@third.party.id.provider.com";

  beforeAll(async () => {
    pgContext = await setUpTestDatabaseContexts(testId);
    expressApp = buildExpressApp();
    // set up an existing user
    const userId = await userIdsRepo.insert();
    credentialsRepo.insert(userId.id, existingUserEmail, "aoeu");
    credentialsRepo.insert(userId.id, existingUserEmailWithNoPassword, null);
  });

  beforeEach(async () => {
    await valkeyManager.context.removeAllKeys();
  });

  afterAll(async () => {
    await pgContext.cleanup();
    await valkeyManager.context.cleanup();
  });

  it("gets error for trying to sign up with an existing email with existing password", async () => {
    const response = await request(expressApp).post(ROUTES.USERS.ROOT).send({
      email: existingUserEmail,
      websiteName: "test",
      activationPageUrl: "http://test.com",
    });

    expect(response.status).toBe(403);
    expect(
      responseBodyIncludesCustomErrorMessage(
        response,
        ERROR_MESSAGES.CREDENTIALS.EMAIL_IN_USE_OR_UNAVAILABLE
      )
    ).toBeTruthy();
  });

  it("allows sign up with an existing email if no existing password", async () => {
    const response = await request(expressApp).post(ROUTES.USERS.ROOT).send({
      email: existingUserEmailWithNoPassword,
      websiteName: "test",
      activationPageUrl: "http://test.com",
    });

    expect(response.status).toBe(201);
    expect(sendEmail).toHaveBeenCalled();
  });
});
