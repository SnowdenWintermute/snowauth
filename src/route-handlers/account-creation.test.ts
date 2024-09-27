import { valkeyManager } from "../kv-store/client.js";
import PGTestingContext from "../utils/testing/pg-context.js";
import setUpTestDatabaseContexts from "../utils/testing/set-up-test-database-contexts.js";

describe("accountCreationHandler", () => {
  const testId = Date.now().toString();
  let pgContext: PGTestingContext;
  beforeAll(async () => {
    pgContext = await setUpTestDatabaseContexts(testId);
  });

  afterAll(async () => {
    await pgContext.cleanup();
    await valkeyManager.context.cleanup();
  });

  it("runs a test", async () => {
    expect(1 + 1).toBe(2);
  });
});
