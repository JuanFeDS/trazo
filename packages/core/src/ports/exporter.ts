import type { Diagram, Position } from '../domain/diagram';

// `positions` trae las posiciones calculadas por el layout; las manuales del diagrama mandan sobre ellas.
export interface ExportRequest {
  diagram: Diagram;
  positions: Record<string, Position>;
}

export interface ExportedFile {
  fileName: string;
  mimeType: string;
  data: string | Uint8Array;
}

export interface Exporter {
  readonly format: 'svg' | 'png' | 'json';
  export(request: ExportRequest): Promise<ExportedFile>;
}
