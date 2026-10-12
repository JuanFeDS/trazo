import {
  serializeDiagram,
  suggestFileName,
  type ExportedFile,
  type ExportRequest,
  type Exporter,
} from '@trazo/core';

// El mismo documento que guarda "Guardar": se puede volver a abrir en Trazo.
export class JsonExporter implements Exporter {
  readonly format = 'json' as const;

  async export({ diagram }: ExportRequest): Promise<ExportedFile> {
    return {
      fileName: suggestFileName(diagram.title, 'json'),
      mimeType: 'application/json',
      data: serializeDiagram(diagram),
    };
  }
}
