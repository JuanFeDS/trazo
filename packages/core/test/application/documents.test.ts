import { describe, expect, it } from 'vitest';
import {
  listDocuments,
  loadDocument,
  openDiagramFile,
  saveDiagramFile,
  saveDocument,
  suggestFileName,
} from '../../src/application/documents';
import { exampleFlowchart, exampleMindmap } from '../../src/domain/example';
import type { FileGateway, OpenedFile, SaveRequest } from '../../src/ports/files';
import type { DiagramRepository, StoredRecord } from '../../src/ports/repository';
import { serializeDiagram } from '../../src/schema/validate';

class MemoryRepository implements DiagramRepository {
  readonly records = new Map<string, StoredRecord>();

  async list() {
    return [...this.records.values()].map(({ data: _data, ...summary }) => summary);
  }

  async load(id: string) {
    return this.records.get(id);
  }

  async save(record: StoredRecord) {
    this.records.set(record.id, record);
  }

  async remove(id: string) {
    this.records.delete(id);
  }
}

class FakeGateway implements FileGateway {
  lastSave: SaveRequest | undefined;

  constructor(private readonly toOpen: OpenedFile | null) {}

  async open() {
    return this.toOpen;
  }

  async save(request: SaveRequest) {
    this.lastSave = request;
    return { name: request.suggestedName, token: 'token-1' };
  }
}

describe('suggestFileName', () => {
  it('convierte el título en un nombre de archivo seguro', () => {
    expect(suggestFileName('Inicio de sesión')).toBe('inicio-de-sesion.json');
    expect(suggestFileName('  ¡Plan: 2026/Q1!  ')).toBe('plan-2026-q1.json');
  });

  it('usa un nombre por defecto si el título no deja nada', () => {
    expect(suggestFileName('???')).toBe('diagrama.json');
  });
});

describe('documentos en el repositorio', () => {
  it('guarda, lista y carga un diagrama', async () => {
    const repository = new MemoryRepository();
    await saveDocument(repository, 'doc-1', exampleMindmap, 1000);

    expect(await listDocuments(repository)).toEqual([
      { id: 'doc-1', title: 'Plan de portafolio', type: 'mindmap', updatedAt: 1000 },
    ]);
    expect(await loadDocument(repository, 'doc-1')).toEqual({ ok: true, diagram: exampleMindmap });
  });

  it('lista primero el más reciente', async () => {
    const repository = new MemoryRepository();
    await saveDocument(repository, 'viejo', exampleFlowchart, 1);
    await saveDocument(repository, 'nuevo', exampleMindmap, 2);
    expect((await listDocuments(repository)).map((summary) => summary.id)).toEqual(['nuevo', 'viejo']);
  });

  it('avisa cuando el diagrama ya no existe', async () => {
    const result = await loadDocument(new MemoryRepository(), 'nada');
    expect(result).toEqual({ ok: false, errors: ['El diagrama guardado ya no existe'] });
  });

  it('valida lo guardado al cargarlo', async () => {
    const repository = new MemoryRepository();
    await repository.save({ id: 'roto', title: 'x', type: 'flowchart', updatedAt: 1, data: { version: 1 } });
    const result = await loadDocument(repository, 'roto');
    expect(result.ok).toBe(false);
  });
});

describe('archivos en disco', () => {
  it('abre un archivo válido', async () => {
    const gateway = new FakeGateway({ name: 'a.json', text: serializeDiagram(exampleFlowchart), token: 't' });
    const opened = await openDiagramFile(gateway);
    expect(opened).toMatchObject({ name: 'a.json', token: 't', result: { ok: true, diagram: exampleFlowchart } });
  });

  it('un archivo inválido devuelve el error sin romper', async () => {
    const gateway = new FakeGateway({ name: 'b.json', text: 'basura' });
    const opened = await openDiagramFile(gateway);
    expect(opened?.result).toEqual({ ok: false, errors: ['El archivo no es JSON válido'] });
  });

  it('devuelve null si la persona cancela', async () => {
    expect(await openDiagramFile(new FakeGateway(null))).toBeNull();
  });

  it('guarda con nombre sugerido y reutiliza el token', async () => {
    const gateway = new FakeGateway(null);
    const saved = await saveDiagramFile(gateway, exampleFlowchart, 'token-previo');
    expect(saved).toEqual({ name: 'inicio-de-sesion.json', token: 'token-1' });
    expect(gateway.lastSave).toMatchObject({ suggestedName: 'inicio-de-sesion.json', token: 'token-previo' });
    expect(gateway.lastSave?.text).toBe(serializeDiagram(exampleFlowchart));
  });
});
