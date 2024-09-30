import request, { Agent } from "supertest";
import { valkeyManager } from "../kv-store/client.js";
import PGTestingContext from "../utils/testing/pg-context.js";
import setUpTestDatabaseContexts from "../utils/testing/set-up-test-database-contexts.js";
import { ROUTES } from "../route-names.js";
import buildExpressApp from "../build-express-app.js";
import { Application } from "express";
import createTestUser from "../utils/testing/create-test-user.js";
import { SESSION_COOKIE_NAME } from "../config.js";

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

    agent.jar.setCookie(`${SESSION_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`);

    const protectedResponse = await agent.get(USERS.ROOT + USERS.PROTECTED);
    expect(protectedResponse.status).toBe(200);
  });

  // it(`${allowsText} they present an expired session cookie but present a valid remember me cookie`, async () => {
  //   const loginResponse = await agent
  //     .post(SESSIONS)
  //     .send({ email: existingUserEmail, password: existingUserPassword, rememberMe: true });

  //   const cookieValue = agent.jar.getCookie("cookieName", {
  //     path: "/",
  //     domain: "localhost",
  //     secure: false,
  //     script: true,
  //   });
  //   console.log("COOKIE VALUE: ", cookieValue);

  //   const protectedResponse = await agent.get(USERS.ROOT + USERS.PROTECTED);
  //   expect(protectedResponse.status).toBe(200);
  // });

  // const forbidsText = "forbids a user to access a protected resource if";
  // const sessionCookieMissing = "their session cookie is missing";

  // it(`${forbidsText} ${sessionCookieMissing} and they present no remember me cookie`, async () => {});

  // it(`${forbidsText} ${sessionCookieMissing} and they present an expired remember me cookie`, async () => {});

  // it(`${forbidsText} they present a malformed session cookie`, async () => {});

  // it(`${forbidsText} ${sessionCookieMissing} and they present a malformed remember me cookie`, async () => {});

  // it(`${forbidsText} they present a consumed/used remember me cookie AND locks their account`, async () => {});
});
