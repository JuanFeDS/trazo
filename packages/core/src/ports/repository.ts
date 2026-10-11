import type { Diagram } from '../domain/diagram';

export interface StoredSummary {
  id: string;
  title: string;
  type: Diagram['type'];
  updatedAt: number;
}

// `data` es lo que se guardó tal cual; se valida y migra al cargarlo.
export interface StoredRecord extends StoredSummary {
  data: unknown;
}

export interface DiagramRepository {
  list(): Promise<StoredSummary[]>;
  load(id: string): Promise<StoredRecord | undefined>;
  save(record: StoredRecord): Promise<void>;
  remove(id: string): Promise<void>;
}
