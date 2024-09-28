import { Application } from "express";
import { valkeyManager } from "../kv-store/client.js";
import PGTestingContext from "../utils/testing/pg-context.js";
import setUpTestDatabaseContexts from "../utils/testing/set-up-test-database-contexts.js";
import buildExpressApp from "../buildExpressApp.js";

describe("accountActivationHandler", () => {
  const testId = Date.now().toString();
  let pgContext: PGTestingContext;
  let expressApp: Application;

  beforeAll(async () => {
    pgContext = await setUpTestDatabaseContexts(testId);
    expressApp = buildExpressApp();
  });

  beforeEach(async () => {
    await valkeyManager.context.removeAllKeys();
  });

  afterAll(async () => {
    await pgContext.cleanup();
    await valkeyManager.context.cleanup();
  });

  it("denies invalid or expired tokens", async () => {});

  it("denies valid tokens which do not match a session", async () => {
    // this would be the case if the token was already used, thus consuming
    // the account activation session
  });

  it("can access user restricted resources after account activation", async () => {
    //
  });

  it("allows a user to log in after activation", async () => {
    //
  });

  it("allows a user with previously existing credentials to log in with their newly added password after activation", async () => {
    //
  });
});
