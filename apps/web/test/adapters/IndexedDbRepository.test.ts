import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { IndexedDbRepository } from '../../src/adapters/IndexedDbRepository';

const record = (id: string, title: string, updatedAt = 1) => ({
  id,
  title,
  type: 'mindmap' as const,
  updatedAt,
  data: { version: 1, title, nodes: [{ id: 'r', label: 'Raíz', parent: null }] },
});

describe('IndexedDbRepository', () => {
  let repository: IndexedDbRepository;

  beforeEach(() => {
    repository = new IndexedDbRepository(new IDBFactory());
  });

  it('guarda y carga un registro completo', async () => {
    await repository.save(record('a', 'Uno'));
    expect(await repository.load('a')).toEqual(record('a', 'Uno'));
  });

  it('sobrescribe al guardar el mismo id', async () => {
    await repository.save(record('a', 'Uno'));
    await repository.save(record('a', 'Uno editado', 2));
    expect(await repository.load('a')).toMatchObject({ title: 'Uno editado', updatedAt: 2 });
    expect(await repository.list()).toHaveLength(1);
  });

  it('lista resúmenes sin el contenido del diagrama', async () => {
    await repository.save(record('a', 'Uno'));
    await repository.save(record('b', 'Dos'));
    const summaries = await repository.list();
    expect(summaries.map((summary) => summary.id).sort()).toEqual(['a', 'b']);
    expect(summaries.every((summary) => !('data' in summary))).toBe(true);
  });

  it('borra un registro', async () => {
    await repository.save(record('a', 'Uno'));
    await repository.remove('a');
    expect(await repository.load('a')).toBeUndefined();
    expect(await repository.list()).toEqual([]);
  });

  it('cargar un id inexistente devuelve undefined', async () => {
    expect(await repository.load('nada')).toBeUndefined();
  });

  it('los datos sobreviven a una nueva conexión sobre la misma base', async () => {
    const factory = new IDBFactory();
    await new IndexedDbRepository(factory).save(record('a', 'Uno'));
    expect(await new IndexedDbRepository(factory).load('a')).toMatchObject({ title: 'Uno' });
  });
});
