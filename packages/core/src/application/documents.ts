import type { Diagram } from '../domain/diagram';
import type { FileGateway, SavedFile } from '../ports/files';
import type { DiagramRepository, StoredSummary } from '../ports/repository';
import { parseDiagram, serializeDiagram, validateDiagram, type ParseResult } from '../schema/validate';

export function suggestFileName(title: string, extension = 'json'): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'diagrama'}.${extension}`;
}

export async function listDocuments(repository: DiagramRepository): Promise<StoredSummary[]> {
  const summaries = await repository.list();
  return [...summaries].sort((first, second) => second.updatedAt - first.updatedAt);
}

export function saveDocument(
  repository: DiagramRepository,
  id: string,
  diagram: Diagram,
  now: number = Date.now(),
): Promise<void> {
  return repository.save({ id, title: diagram.title, type: diagram.type, updatedAt: now, data: diagram });
}

export async function loadDocument(repository: DiagramRepository, id: string): Promise<ParseResult> {
  const record = await repository.load(id);
  if (!record) {
    return { ok: false, errors: ['El diagrama guardado ya no existe'] };
  }
  return validateDiagram(record.data);
}

export interface OpenedDiagramFile {
  name: string;
  token?: unknown;
  result: ParseResult;
}

export async function openDiagramFile(gateway: FileGateway): Promise<OpenedDiagramFile | null> {
  const opened = await gateway.open();
  if (!opened) {
    return null;
  }
  return { name: opened.name, token: opened.token, result: parseDiagram(opened.text) };
}

export function saveDiagramFile(
  gateway: FileGateway,
  diagram: Diagram,
  token?: unknown,
): Promise<SavedFile | null> {
  return gateway.save({
    suggestedName: suggestFileName(diagram.title),
    text: serializeDiagram(diagram),
    token,
  });
}
