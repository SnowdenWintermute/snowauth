import { Application } from "express";
import request, { Agent } from "supertest";
import { valkeyManager } from "../kv-store/client.js";
import PGTestingContext from "../utils/testing/pg-context.js";
import setUpTestDatabaseContexts from "../utils/testing/set-up-test-database-contexts.js";
import buildExpressApp from "../build-express-app.js";
import { ROUTES } from "../route-names.js";
import createSession from "../tokens/create-session.js";
import { PASSWORD_RESET_SESSION_PREFIX } from "../kv-store/consts.js";
import { responseBodyIncludesCustomErrorMessage } from "../utils/testing/custom-error-checkers.js";
import { ERROR_MESSAGES } from "../errors/error-messages.js";
import { env } from "../utils/load-env-variables.js";
import createTestUser from "../utils/testing/create-test-user.js";

jest.mock("../emails/send-email.js");

describe("changePasswordHandler", () => {
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

  it(`denies a user to log in with new password after attempting to change their password with
     an invalid token`, async () => {
    const newPassword = "new password";
    await createSession(
      PASSWORD_RESET_SESSION_PREFIX,
      existingUserEmail,
      env.PASSWORD_RESET_SESSION_EXPIRATION
    );

    const activationResponse = await agent.put(CREDENTIALS.ROOT).send({
      password: newPassword,
      passwordConfirm: newPassword,
      token: "some invalid token",
    });
    expect(activationResponse.status).toBe(401);
    expect(
      responseBodyIncludesCustomErrorMessage(
        activationResponse,
        ERROR_MESSAGES.SESSION.INVALID_OR_EXPIRED_TOKEN
      )
    ).toBeTruthy();

    const loginAttemptResponse = await agent
      .post(SESSIONS)
      .send({ email: existingUserEmail, password: newPassword });
    expect(loginAttemptResponse.status).toBe(401);
    expect(
      responseBodyIncludesCustomErrorMessage(
        loginAttemptResponse,
        ERROR_MESSAGES.CREDENTIALS.INVALID
      )
    );
  });

  it(`denies a user to log in with new password after attempting to change their password with
     an invalid token`, async () => {
    const newPassword = "new password";
    const { sessionId } = await createSession(
      PASSWORD_RESET_SESSION_PREFIX,
      existingUserEmail,
      env.PASSWORD_RESET_SESSION_EXPIRATION
    );

    await valkeyManager.context.removeAllKeys();

    const activationResponse = await agent.put(CREDENTIALS.ROOT).send({
      password: newPassword,
      passwordConfirm: newPassword,
      token: sessionId,
    });
    expect(activationResponse.status).toBe(401);
    expect(
      responseBodyIncludesCustomErrorMessage(
        activationResponse,
        ERROR_MESSAGES.SESSION.INVALID_OR_EXPIRED_TOKEN
      )
    ).toBeTruthy();

    const loginAttemptResponse = await agent
      .post(SESSIONS)
      .send({ email: existingUserEmail, password: newPassword });
    expect(loginAttemptResponse.status).toBe(401);
    expect(
      responseBodyIncludesCustomErrorMessage(
        loginAttemptResponse,
        ERROR_MESSAGES.CREDENTIALS.INVALID
      )
    );
  });

  it(`denies a user to log in with new password after attempting to change their password with
     an token which has already been used`, async () => {
    const newPassword = "new password";
    const secondNewPassword = "another new password";
    const { sessionId } = await createSession(
      PASSWORD_RESET_SESSION_PREFIX,
      existingUserEmail,
      env.PASSWORD_RESET_SESSION_EXPIRATION
    );

    const activationResponse = await agent.put(CREDENTIALS.ROOT).send({
      password: newPassword,
      passwordConfirm: newPassword,
      token: sessionId,
    });
    expect(activationResponse.status).toBe(201);

    const activationWithUsedTokenResponse = await agent.put(CREDENTIALS.ROOT).send({
      password: secondNewPassword,
      passwordConfirm: secondNewPassword,
      token: sessionId,
    });

    expect(activationWithUsedTokenResponse.status).toBe(401);
    expect(
      responseBodyIncludesCustomErrorMessage(
        activationWithUsedTokenResponse,
        ERROR_MESSAGES.SESSION.INVALID_OR_EXPIRED_TOKEN
      )
    );

    const loginAttemptResponse = await agent
      .post(SESSIONS)
      .send({ email: existingUserEmail, password: secondNewPassword });
    expect(loginAttemptResponse.status).toBe(401);
    expect(
      responseBodyIncludesCustomErrorMessage(
        loginAttemptResponse,
        ERROR_MESSAGES.CREDENTIALS.INVALID
      )
    );
  });

  it("allows a user to log in with their new password and not with their old one", async () => {
    const newPassword = "a new password";
    const { sessionId } = await createSession(
      PASSWORD_RESET_SESSION_PREFIX,
      existingUserEmail,
      env.PASSWORD_RESET_SESSION_EXPIRATION
    );

    const changePasswordResponse = await request(expressApp).put(CREDENTIALS.ROOT).send({
      password: newPassword,
      passwordConfirm: newPassword,
      token: sessionId,
    });

    expect(changePasswordResponse.status).toBe(201);

    const loginWithOldPasswordResponse = await request(expressApp)
      .post(SESSIONS)
      .send({ email: existingUserEmail, password: existingUserPassword });
    expect(loginWithOldPasswordResponse.status).toBe(401);

    const loginResponse = await request(expressApp)
      .post(SESSIONS)
      .send({ email: existingUserEmail, password: newPassword });
    expect(loginResponse.status).toBe(201);
  });
});
