// `token` identifica el archivo para poder sobrescribirlo después; el núcleo no sabe qué contiene.
export interface OpenedFile {
  name: string;
  text: string;
  token?: unknown;
}

export interface SaveRequest {
  suggestedName: string;
  text: string;
  token?: unknown;
}

export interface SavedFile {
  name: string;
  token?: unknown;
}

// Ambos devuelven null cuando la persona cancela el diálogo.
export interface FileGateway {
  open(): Promise<OpenedFile | null>;
  save(request: SaveRequest): Promise<SavedFile | null>;
}
