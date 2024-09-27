import { valkeyManager } from "../kv-store/client.js";
import PGTestingContext from "../utils/testing/pg-context.js";
import setUpTestDatabaseContexts from "../utils/testing/set-up-test-database-contexts.js";

describe("accountActivationHandler", () => {
  const testId = Date.now().toString();
  let pgContext: PGTestingContext;
  beforeAll(async () => {
    pgContext = await setUpTestDatabaseContexts(testId);
  });

  afterAll(async () => {
    await pgContext.cleanup();
    await valkeyManager.context.cleanup();
  });

  it("sets a valkey key", async () => {
    await valkeyManager.context.set("a", "b");
    const shouldBeLowercaseB = await valkeyManager.context.get("a");
    expect(shouldBeLowercaseB).toBe("b");
  });
});
