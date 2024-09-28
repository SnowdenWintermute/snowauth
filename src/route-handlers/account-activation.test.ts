import { Application } from "express";
import request from "supertest";
import { valkeyManager } from "../kv-store/client.js";
import PGTestingContext from "../utils/testing/pg-context.js";
import setUpTestDatabaseContexts from "../utils/testing/set-up-test-database-contexts.js";
import buildExpressApp from "../buildExpressApp.js";
import { ROUTE_NAMES } from "../route-names.js";
import { ACCESS_TOKEN_COOKIE_NAME } from "../config.js";
import signTokenAndCreateSession from "../utils/sign-token-and-create-session.js";
import { createAccountActivationTokenAndSession } from "./account-creation.js";

jest.mock("../emails/send-email.js");

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

  it("denies invalid or expired tokens", async () => {
    const accountActivationToken = createAccountActivationTokenAndSession("some@email.com", null);

    const activationResponse = await request(expressApp).put(ROUTE_NAMES.USERS);
  });

  //it("denies a valid token which has already been used", async () => {
  //  //
  //});

  //it("doesn't change the password of existing credentials with the same email", async () => {
  //  //
  //});

  //it("can access user restricted resources after account activation", async () => {
  //  //
  //});

  //it("allows a user to log in after activation", async () => {
  //  //
  //});

  //it("allows a user with previously existing credentials to log in with their newly added password after activation", async () => {
  //  //
  //});
});
