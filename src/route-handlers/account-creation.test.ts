import request from "supertest";
import { valkeyManager } from "../kv-store/client.js";
import PGTestingContext from "../utils/testing/pg-context.js";
import setUpTestDatabaseContexts from "../utils/testing/set-up-test-database-contexts.js";
import { sendEmail } from "../emails/send-email.js";
import { credentialsRepo } from "../database/repos/credentials.js";
import { userIdsRepo } from "../database/repos/user_ids.js";
import { expressApp } from "../index.js";
import { ROUTE_NAMES } from "../route-names.js";
import {
  responseBodyIncludesCustomErrorField,
  responseBodyIncludesCustomErrorMessage,
} from "../utils/testing/custom-error-checkers.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";

jest.mock("../emails/send-email.js");

describe("accountCreationHandler", () => {
  const testId = Date.now().toString();
  let pgContext: PGTestingContext;
  beforeAll(async () => {
    pgContext = await setUpTestDatabaseContexts(testId);
  });

  beforeEach(async () => {
    await valkeyManager.context.removeAllKeys();
  });

  afterAll(async () => {
    await pgContext.cleanup();
    await valkeyManager.context.cleanup();
  });

  it("gets error for trying to sign up with an existing email with existing password", async () => {
    const userId = await userIdsRepo.insert();
    credentialsRepo.insert(userId.id, "existing@email.com", "aoeu");
    const response = await request(expressApp).post(ROUTE_NAMES.USERS).send({});
    expect(response.status).toBe(400);
    expect(response.body.error);
    expect(
      responseBodyIncludesCustomErrorMessage(
        response,
        ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD.EMAIL
      )
    ).toBeTruthy();
    expect(responseBodyIncludesCustomErrorField(response, "email")).toBeTruthy();
  });
});
