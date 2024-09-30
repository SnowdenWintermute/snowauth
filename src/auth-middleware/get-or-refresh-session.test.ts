import request, { Agent } from "supertest";
import { valkeyManager } from "../kv-store/client.js";
import PGTestingContext from "../utils/testing/pg-context.js";
import setUpTestDatabaseContexts from "../utils/testing/set-up-test-database-contexts.js";
import { ROUTES } from "../route-names.js";
import buildExpressApp from "../build-express-app.js";
import { Application } from "express";
import createTestUser from "../utils/testing/create-test-user.js";
import { REMEMBER_ME_COOKIE_NAME, SESSION_COOKIE_NAME } from "../config.js";
import { CookieAccessInfo } from "cookiejar";

describe("getOrRefreshSession", () => {
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

  const allowsText = "allows a user to access a protected resource if";

  it(`${allowsText} they present a valid, unexpired session cookie`, async () => {
    await agent
      .post(SESSIONS)
      .send({ email: existingUserEmail, password: existingUserPassword, rememberMe: true });

    const protectedResponse = await agent.get(USERS.ROOT + USERS.PROTECTED);
    expect(protectedResponse.status).toBe(200);
  });

  it(`${allowsText} they present no session cookie but present a valid remember me cookie`, async () => {
    await agent
      .post(SESSIONS)
      .send({ email: existingUserEmail, password: existingUserPassword, rememberMe: true });

    // HOW TO DELETE A COOKIE PROPERLY
    agent.jar.setCookie(`${SESSION_COOKIE_NAME}=;`, "127.0.0.1", "/");

    const protectedResponse = await agent.get(USERS.ROOT + USERS.PROTECTED);
    expect(protectedResponse.status).toBe(200);
  });

  it(`${allowsText} they present an expired session cookie but present a valid remember me cookie`, async () => {
    await agent
      .post(SESSIONS)
      .send({ email: existingUserEmail, password: existingUserPassword, rememberMe: true });

    // all sessions are now expired
    await valkeyManager.context.removeAllKeys();

    const protectedResponse = await agent.get(USERS.ROOT + USERS.PROTECTED);
    expect(protectedResponse.status).toBe(200);
  });

  it(`repeatedly ${allowsText} they present expired session cookies and valid remember me cookies`, async () => {
    await agent
      .post(SESSIONS)
      .send({ email: existingUserEmail, password: existingUserPassword, rememberMe: true });

    // all sessions are now expired
    await valkeyManager.context.removeAllKeys();

    const protectedResponse = await agent.get(USERS.ROOT + USERS.PROTECTED);
    expect(protectedResponse.status).toBe(200);

    // all sessions are now expired
    await valkeyManager.context.removeAllKeys();

    const secondProtectedResponse = await agent.get(USERS.ROOT + USERS.PROTECTED);
    expect(secondProtectedResponse.status).toBe(200);
  });

  // const forbidsText = "forbids a user to access a protected resource if";
  // const sessionCookieMissing = "their session cookie is missing";

  // it(`${forbidsText} ${sessionCookieMissing} and they present no remember me cookie`, async () => {});

  // it(`${forbidsText} ${sessionCookieMissing} and they present an expired remember me cookie`, async () => {});

  // it(`${forbidsText} they present a malformed session cookie`, async () => {});

  // it(`${forbidsText} ${sessionCookieMissing} and they present a malformed remember me cookie`, async () => {});

  // it(`${forbidsText} they present a consumed/used remember me cookie AND locks their account`, async () => {});
});
