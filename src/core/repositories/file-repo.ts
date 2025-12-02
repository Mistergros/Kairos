import type { DUERP } from "../models/duerp";
import type { DUERPRepository } from "./duerp-repo";

export class FileRepository implements DUERPRepository {
  constructor(private storageKey = "duerp-store") {}

  private readAll(): DUERP[] {
    if (typeof localStorage === "undefined") return [];
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      return JSON.parse(raw) as DUERP[];
    } catch (err) {
      console.error("Failed to parse DUERP storage", err);
      return [];
    }
  }

  private writeAll(items: DUERP[]) {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    } catch (err) {
      console.error("Failed to persist DUERP storage", err);
    }
  }

  save(duerp: DUERP): void {
    const existing = this.readAll().filter((item) => item.id !== duerp.id);
    existing.push(duerp);
    this.writeAll(existing);
  }

  get(id: string): DUERP | undefined {
    return this.readAll().find((item) => item.id === id);
  }

  list(): DUERP[] {
    return this.readAll();
  }
}
