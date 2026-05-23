import type {
  ActionRecord,
  ActionStore,
} from "../../apps/api/src/db/actions.js";

export class InMemoryActionStore implements ActionStore {
  public readonly actions: ActionRecord[] = [];

  // eslint-disable-next-line @typescript-eslint/require-await
  async insert(action: ActionRecord): Promise<void> {
    this.actions.push({ ...action });
  }
}
