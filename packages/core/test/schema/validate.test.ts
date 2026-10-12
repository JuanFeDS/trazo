import { describe, expect, it } from 'vitest';
import { exampleFlowchart, exampleMindmap } from '../../src/domain/example';
import {
  CURRENT_VERSION,
  parseDiagram,
  serializeDiagram,
  validateDiagram,
} from '../../src/schema/validate';

function errorsOf(input: unknown, options?: Parameters<typeof validateDiagram>[1]): string[] {
  const result = validateDiagram(input, options);
  if (result.ok) {
    throw new Error('Se esperaba un error de validación');
  }
  return result.errors;
}

const minimalMindmap = {
  version: 1,
  type: 'mindmap',
  title: 'Mapa',
  nodes: [
    { id: 'r', label: 'Raíz', parent: null },
    { id: 'a', label: 'A', parent: 'r' },
  ],
};

describe('ida y vuelta', () => {
  it.each([
    ['diagrama de flujo', exampleFlowchart],
    ['mapa mental', exampleMindmap],
  ])('serializar y volver a leer un %s no cambia nada', (_name, diagram) => {
    const result = parseDiagram(serializeDiagram(diagram));
    expect(result).toEqual({ ok: true, diagram });
  });

  it('descarta los campos desconocidos', () => {
    const result = validateDiagram({ ...minimalMindmap, secreto: 1 });
    expect(result.ok && 'secreto' in result.diagram).toBe(false);
  });
});

describe('archivos inválidos', () => {
  it('rechaza texto que no es JSON', () => {
    expect(parseDiagram('{ esto no es json')).toEqual({
      ok: false,
      errors: ['El archivo no es JSON válido'],
    });
  });

  it('rechaza JSON que no es un objeto', () => {
    expect(errorsOf([1, 2, 3])[0]).toMatch(/objeto JSON/);
    expect(errorsOf(null)[0]).toMatch(/objeto JSON/);
  });

  it('exige un tipo conocido', () => {
    expect(errorsOf({ version: 1, type: 'gantt', title: 'x', nodes: [] })).toContain(
      'type: debe ser flowchart o mindmap',
    );
  });

  it('dice qué campo falla y dónde', () => {
    const errors = errorsOf({
      ...exampleFlowchart,
      nodes: [{ id: 'a', label: 'A', kind: 'raro' }],
      edges: [],
    });
    expect(errors).toContain('nodes[0].kind: debe ser start, process, decision o end');
  });

  it('rechaza ids de nodo repetidos', () => {
    const errors = errorsOf({
      ...exampleFlowchart,
      nodes: [
        { id: 'a', label: 'A', kind: 'start' },
        { id: 'a', label: 'B', kind: 'end' },
      ],
      edges: [],
    });
    expect(errors).toContain('nodes[1].id: el id "a" está repetido');
  });

  it('rechaza conexiones a nodos que no existen', () => {
    const errors = errorsOf({
      ...exampleFlowchart,
      nodes: [{ id: 'a', label: 'A', kind: 'start' }],
      edges: [{ id: 'e', from: 'a', to: 'fantasma' }],
    });
    expect(errors).toContain('edges[0].to: el nodo "fantasma" no existe');
  });

  it('rechaza una posición con valores no finitos', () => {
    const errors = errorsOf({
      ...exampleFlowchart,
      nodes: [{ id: 'a', label: 'A', kind: 'start', position: { x: 'uno', y: 2 } }],
      edges: [],
    });
    expect(errors[0]).toMatch(/nodes\[0\]\.position/);
  });

  it('limita la cantidad de errores que reporta', () => {
    const nodes = Array.from({ length: 50 }, () => ({ id: 1, label: 2, kind: 3 }));
    expect(errorsOf({ ...exampleFlowchart, nodes, edges: [] }).length).toBeLessThanOrEqual(10);
  });
});

describe('árbol del mapa mental', () => {
  it('exige exactamente una raíz', () => {
    const twoRoots = {
      ...minimalMindmap,
      nodes: [
        { id: 'r', label: 'Raíz', parent: null },
        { id: 'x', label: 'Otra raíz', parent: null },
      ],
    };
    expect(errorsOf(twoRoots)[0]).toMatch(/exactamente una raíz.*hay 2/);
    expect(errorsOf({ ...minimalMindmap, nodes: [] })[0]).toMatch(/hay 0/);
  });

  it('rechaza un padre que no existe', () => {
    const orphan = {
      ...minimalMindmap,
      nodes: [...minimalMindmap.nodes, { id: 'b', label: 'B', parent: 'nadie' }],
    };
    expect(errorsOf(orphan)).toContain('nodes[2].parent: el nodo "nadie" no existe');
  });

  it('acepta el lado de una rama y rechaza uno inválido', () => {
    const withSide = {
      ...minimalMindmap,
      nodes: [{ id: 'r', label: 'Raíz', parent: null }, { id: 'a', label: 'A', parent: 'r', side: 'left' }],
    };
    const result = validateDiagram(withSide);
    expect(result.ok && result.diagram.nodes[1]).toMatchObject({ side: 'left' });
    const vertical = { ...withSide, nodes: [withSide.nodes[0], { ...withSide.nodes[1], side: 'top' }] };
    expect(validateDiagram(vertical).ok).toBe(true);
    const invalid = { ...withSide, nodes: [withSide.nodes[0], { ...withSide.nodes[1], side: 'arriba' }] };
    expect(errorsOf(invalid)).toContain('nodes[1].side: debe ser left, right, top o bottom');
  });

  it('detecta ciclos de padres', () => {
    const cycle = {
      ...minimalMindmap,
      nodes: [
        { id: 'r', label: 'Raíz', parent: null },
        { id: 'a', label: 'A', parent: 'b' },
        { id: 'b', label: 'B', parent: 'a' },
      ],
    };
    expect(errorsOf(cycle).join(' ')).toMatch(/ciclo/);
  });
});

describe('versiones y migraciones', () => {
  it('exige una versión entera válida', () => {
    expect(errorsOf({ ...minimalMindmap, version: 'uno' })[0]).toMatch(/^version:/);
    expect(errorsOf({ ...minimalMindmap, version: 0 })[0]).toMatch(/^version:/);
    expect(errorsOf({ ...minimalMindmap, version: undefined })[0]).toMatch(/^version:/);
  });

  it('rechaza un archivo de una versión más nueva que la app', () => {
    const errors = errorsOf({ ...minimalMindmap, version: CURRENT_VERSION + 1 });
    expect(errors[0]).toMatch(/versión .* actualiza la app/);
  });

  it('un archivo de la v1 se abre cuando la app ya es de la v3', () => {
    const migrations = {
      1: (raw: Record<string, unknown>) => ({ ...raw, title: `${String(raw.title)} (v2)` }),
      2: (raw: Record<string, unknown>) => ({ ...raw, title: `${String(raw.title)} (v3)` }),
    };
    const result = validateDiagram(minimalMindmap, { currentVersion: 3, migrations });
    expect(result.ok && result.diagram.title).toBe('Mapa (v2) (v3)');
    expect(result.ok && (result.diagram.version as number)).toBe(3);
  });

  it('falla con claridad si falta una migración intermedia', () => {
    const errors = errorsOf(minimalMindmap, { currentVersion: 3, migrations: {} });
    expect(errors[0]).toMatch(/no hay migración desde la versión 1/);
  });
});
