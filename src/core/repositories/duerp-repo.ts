import type { DUERP } from "../models/duerp";

export interface DUERPRepository {
  save(duerp: DUERP): void | Promise<void>;
  get(id: string): DUERP | undefined | Promise<DUERP | undefined>;
  list(): DUERP[] | Promise<DUERP[]>;
}
