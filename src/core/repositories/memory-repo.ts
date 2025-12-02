import type { DUERP } from "../models/duerp";
import type { DUERPRepository } from "./duerp-repo";

export class MemoryRepository implements DUERPRepository {
  private store = new Map<string, DUERP>();

  save(duerp: DUERP): void {
    this.store.set(duerp.id, duerp);
  }

  get(id: string): DUERP | undefined {
    return this.store.get(id);
  }

  list(): DUERP[] {
    return Array.from(this.store.values());
  }
}
