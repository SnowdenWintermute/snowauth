import { ValkeyManager, valkeyManager } from "../../kv-store/client";
import PGTestingContext from "./pg-context";

export default async function setUpTestDatabaseContexts(uniqueTestId: string) {
  const pgContext = await PGTestingContext.build(uniqueTestId);
  valkeyManager.context = new ValkeyManager(uniqueTestId);
  await valkeyManager.context.connect();
  return pgContext;
}
