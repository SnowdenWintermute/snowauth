import { Application } from "express";
import request, { Agent } from "supertest";
import { valkeyManager } from "../kv-store/client.js";
import PGTestingContext from "../utils/testing/pg-context.js";
import setUpTestDatabaseContexts from "../utils/testing/set-up-test-database-contexts.js";
import buildExpressApp from "../buildExpressApp.js";
import { ROUTES } from "../route-names.js";
import createSession from "../tokens/create-session.js";
import { ACCOUNT_CREATION_SESSION_PREFIX } from "../kv-store/consts.js";
import { responseBodyIncludesCustomErrorMessage } from "../utils/testing/custom-error-checkers.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { credentialsRepo } from "../database/repos/credentials.js";
import { env } from "../utils/load-env-variables.js";
import { userIdsRepo } from "../database/repos/user-ids.js";
import { profilesRepo } from "../database/repos/profiles.js";

jest.mock("../emails/send-email.js");

describe("accountActivationHandler", () => {
  const testId = Date.now().toString();
  let pgContext: PGTestingContext;
  let expressApp: Application;
  let agent: Agent;

  beforeAll(async () => {
    pgContext = await setUpTestDatabaseContexts(testId);
    expressApp = buildExpressApp();
  });

  beforeEach(async () => {
    await valkeyManager.context.removeAllKeys();
    agent = request.agent(expressApp);
  });

  afterAll(async () => {
    await pgContext.cleanup();
    await valkeyManager.context.cleanup();
  });

  it("denies invalid tokens", async () => {
    const email = "some@email.com";
    await createSession(
      ACCOUNT_CREATION_SESSION_PREFIX,
      email,
      env.ACCOUNT_ACTIVATION_SESSION_EXPIRATION
    );

    const activationResponse = await request(expressApp).put(ROUTES.USERS.ROOT).send({
      username: "some name",
      password: "some password",
      passwordConfirm: "some password",
      token: "some invalid token",
    });
    expect(activationResponse.status).toBe(401);
    expect(
      responseBodyIncludesCustomErrorMessage(
        activationResponse,
        ERROR_MESSAGES.SESSION.INVALID_OR_EXPIRED_TOKEN
      )
    ).toBeTruthy();

    const accountThatShouldNotBeActivated = await credentialsRepo.findOne("emailAddress", email);
    expect(accountThatShouldNotBeActivated).toBeUndefined();
  });

  it("denies expired tokens", async () => {
    const email = "some.expiring.session@email.com";
    const username = "some name";

    const { sessionId: accountActivationToken, sessionName } = await createSession(
      ACCOUNT_CREATION_SESSION_PREFIX,
      email,
      env.ACCOUNT_ACTIVATION_SESSION_EXPIRATION
    );

    await valkeyManager.context.expire(sessionName, 0, "LT");

    const activationResponse = await request(expressApp).put(ROUTES.USERS.ROOT).send({
      username,
      password: "some password",
      passwordConfirm: "some password",
      token: accountActivationToken,
    });

    expect(activationResponse.status).toBe(401);
    expect(
      responseBodyIncludesCustomErrorMessage(
        activationResponse,
        ERROR_MESSAGES.SESSION.INVALID_OR_EXPIRED_TOKEN
      )
    ).toBeTruthy();
  });

  it("sends back the created user info and valid session id after activating an account", async () => {
    const email = "some@email.com";
    const username = "some name";
    const { sessionId: accountActivationToken } = await createSession(
      ACCOUNT_CREATION_SESSION_PREFIX,
      email,
      env.ACCOUNT_ACTIVATION_SESSION_EXPIRATION
    );

    const activationResponse = await agent.put(ROUTES.USERS.ROOT).send({
      username,
      password: "some password",
      passwordConfirm: "some password",
      token: accountActivationToken,
    });

    expect(activationResponse.status).toBe(201);

    expect(activationResponse.body.email).toBe(email);
    expect(activationResponse.body.username).toBe(username);

    const protectedResourceResponse = await agent.get(ROUTES.USERS.ROOT + ROUTES.USERS.PROTECTED);
    console.log(protectedResourceResponse.error);
    expect(protectedResourceResponse.status).toBe(200);
  });

  it("denies a valid token which has already been used", async () => {
    const email = "some.other@email.com";
    const username = "some other name";
    const { sessionId: accountActivationToken } = await createSession(
      ACCOUNT_CREATION_SESSION_PREFIX,
      email,
      env.ACCOUNT_ACTIVATION_SESSION_EXPIRATION
    );

    const activationResponse = await request(expressApp).put(ROUTES.USERS.ROOT).send({
      username,
      password: "some password",
      passwordConfirm: "some password",
      token: accountActivationToken,
    });

    expect(activationResponse.status).toBe(201);

    const secondActiationAttemptResponse = await request(expressApp).put(ROUTES.USERS.ROOT).send({
      username,
      password: "some password",
      passwordConfirm: "some password",
      token: accountActivationToken,
    });

    expect(secondActiationAttemptResponse.status).toBe(401);
    expect(
      responseBodyIncludesCustomErrorMessage(
        secondActiationAttemptResponse,
        ERROR_MESSAGES.SESSION.INVALID_OR_EXPIRED_TOKEN
      )
    ).toBeTruthy();
  });

  it("doesn't change the username of existing credentials with the same email", async () => {
    const userIdRecord = await userIdsRepo.insert();
    const existingUserEmail = "some.existing.user@email.com";
    const existingUsername = "some existing username";
    const attemptedNewUsername = "some new username";
    credentialsRepo.insert(userIdRecord.id, existingUserEmail, "aoeu");
    profilesRepo.insert(userIdRecord.id, existingUsername);

    const { sessionId: accountActivationToken } = await createSession(
      ACCOUNT_CREATION_SESSION_PREFIX,
      existingUserEmail,
      env.ACCOUNT_ACTIVATION_SESSION_EXPIRATION
    );

    await request(expressApp).put(ROUTES.USERS.ROOT).send({
      username: attemptedNewUsername,
      password: "some password",
      passwordConfirm: "some password",
      token: accountActivationToken,
    });

    const updatedProfile = await profilesRepo.findOne("userId", userIdRecord.id);
    if (updatedProfile === undefined) return expect(updatedProfile).toBeDefined();
    expect(updatedProfile.username).not.toBe(attemptedNewUsername);
    expect(updatedProfile.username).toBe(existingUsername);
  });

  it("can access user restricted resources after account activation", async () => {
    await request(expressApp).get(ROUTES.USERS.ROOT + ROUTES.USERS.PROTECTED);
  });

  //it("allows a user to log in after activation", async () => {
  //  //
  //});

  //it("allows a user with previously existing credentials to log in with their newly added password after activation", async () => {
  //  //
  //});
});
