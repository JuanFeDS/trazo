import type { FileGateway, OpenedFile, SaveRequest, SavedFile } from '@trazo/core';

interface WritableLike {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

interface FileHandleLike {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<WritableLike>;
}

interface PickerOptions {
  suggestedName?: string;
  types: { description: string; accept: Record<string, string[]> }[];
}

interface PickerWindow {
  showOpenFilePicker?: (options: PickerOptions) => Promise<FileHandleLike[]>;
  showSaveFilePicker?: (options: PickerOptions) => Promise<FileHandleLike>;
}

const FILE_TYPES: PickerOptions['types'] = [
  { description: 'Diagrama de Trazo', accept: { 'application/json': ['.json'] } },
];

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function isFileHandle(token: unknown): token is FileHandleLike {
  return typeof token === 'object' && token !== null && 'createWritable' in token;
}

async function write(handle: FileHandleLike, text: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

function pickWithInput(): Promise<OpenedFile | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('cancel', () => resolve(null));
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file.text().then((text) => resolve({ name: file.name, text }), reject);
    });
    input.click();
  });
}

function download(name: string, text: string): SavedFile {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
  return { name };
}

// File System Access API en Chrome y Edge; en el resto baja a subir y descargar archivos.
export class FileSystemAccessGateway implements FileGateway {
  private readonly picker = window as unknown as PickerWindow;

  async open(): Promise<OpenedFile | null> {
    if (!this.picker.showOpenFilePicker) {
      return pickWithInput();
    }
    try {
      const [handle] = await this.picker.showOpenFilePicker({ types: FILE_TYPES });
      if (!handle) {
        return null;
      }
      const file = await handle.getFile();
      return { name: file.name, text: await file.text(), token: handle };
    } catch (error) {
      if (isAbort(error)) {
        return null;
      }
      throw error;
    }
  }

  async save({ suggestedName, text, token }: SaveRequest): Promise<SavedFile | null> {
    if (isFileHandle(token)) {
      try {
        await write(token, text);
        return { name: token.name, token };
      } catch (error) {
        if (isAbort(error)) {
          return null;
        }
        // Si el permiso caducó, se vuelve a pedir un destino abajo.
      }
    }
    if (!this.picker.showSaveFilePicker) {
      return download(suggestedName, text);
    }
    try {
      const handle = await this.picker.showSaveFilePicker({ suggestedName, types: FILE_TYPES });
      await write(handle, text);
      return { name: handle.name, token: handle };
    } catch (error) {
      if (isAbort(error)) {
        return null;
      }
      throw error;
    }
  }
}
