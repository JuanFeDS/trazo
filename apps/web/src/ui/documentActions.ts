import {
  listDocuments,
  loadDocument,
  openDiagramFile,
  saveDiagramFile,
  saveDocument,
  type Diagram,
  type ExportedFile,
  type Exporter,
} from '@trazo/core';
import { newId, useDiagramStore } from '../state/diagramStore';
import type { Services } from './services';

const STORAGE_ERROR = 'No se pudo usar el almacenamiento del navegador';

function describe(error: unknown): string[] {
  return [error instanceof Error ? error.message : String(error)];
}

export async function bootDocuments({ repository }: Services): Promise<void> {
  const store = useDiagramStore.getState();
  try {
    const [latest] = await listDocuments(repository);
    if (!latest) {
      return;
    }
    const result = await loadDocument(repository, latest.id);
    if (result.ok) {
      store.loadDocument({ id: latest.id, diagram: result.diagram });
    } else {
      store.showNotice({
        kind: 'error',
        title: `No se pudo abrir «${latest.title}»`,
        details: result.errors,
      });
    }
  } catch (error) {
    store.showNotice({ kind: 'error', title: STORAGE_ERROR, details: describe(error) });
  }
}

export async function openStoredDocument({ repository }: Services, id: string): Promise<void> {
  const store = useDiagramStore.getState();
  try {
    const result = await loadDocument(repository, id);
    if (result.ok) {
      store.loadDocument({ id, diagram: result.diagram });
    } else {
      store.showNotice({ kind: 'error', title: 'No se pudo abrir el diagrama', details: result.errors });
    }
  } catch (error) {
    store.showNotice({ kind: 'error', title: STORAGE_ERROR, details: describe(error) });
  }
}

export async function deleteStoredDocument(services: Services, id: string): Promise<void> {
  const store = useDiagramStore.getState();
  try {
    await services.repository.remove(id);
  } catch (error) {
    store.showNotice({ kind: 'error', title: 'No se pudo borrar el diagrama', details: describe(error) });
    return;
  }
  if (useDiagramStore.getState().documentId === id) {
    store.newDocument('flowchart');
  }
}

export async function openFromDisk({ repository, files }: Services): Promise<void> {
  const store = useDiagramStore.getState();
  try {
    const opened = await openDiagramFile(files);
    if (!opened) {
      return;
    }
    if (!opened.result.ok) {
      store.showNotice({
        kind: 'error',
        title: `No se pudo abrir «${opened.name}»`,
        details: opened.result.errors,
      });
      return;
    }
    const id = newId('d');
    await saveDocument(repository, id, opened.result.diagram);
    store.loadDocument({ id, diagram: opened.result.diagram, token: opened.token });
  } catch (error) {
    store.showNotice({ kind: 'error', title: 'No se pudo abrir el archivo', details: describe(error) });
  }
}

export async function saveToDisk({ files }: Services): Promise<void> {
  const store = useDiagramStore.getState();
  const { diagram, fileToken } = store;
  try {
    const saved = await saveDiagramFile(files, diagram, fileToken);
    if (saved) {
      store.setFileToken(saved.token);
      store.showNotice({ kind: 'info', title: `Guardado en «${saved.name}»`, details: [] });
    }
  } catch (error) {
    store.showNotice({ kind: 'error', title: 'No se pudo guardar el archivo', details: describe(error) });
  }
}

function download(file: ExportedFile): void {
  const part = typeof file.data === 'string' ? file.data : new Uint8Array(file.data);
  const url = URL.createObjectURL(new Blob([part], { type: file.mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = file.fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportDiagram(
  { exporters }: Services,
  format: Exporter['format'],
): Promise<void> {
  const { diagram, autoPositions, showNotice } = useDiagramStore.getState();
  try {
    const file = await exporters[format].export({ diagram, positions: autoPositions });
    download(file);
    showNotice({ kind: 'info', title: `Exportado «${file.fileName}»`, details: [] });
  } catch (error) {
    showNotice({
      kind: 'error',
      title: `No se pudo exportar a ${format.toUpperCase()}`,
      details: describe(error),
    });
  }
}

export async function persistNow(
  { repository }: Services,
  documentId: string,
  diagram: Diagram,
): Promise<void> {
  await saveDocument(repository, documentId, diagram);
}
