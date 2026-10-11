import { describe, expect, it } from 'vitest';
import { clearPositions, createMindmap } from '../../src/domain/diagram';
import {
  addChild,
  addSibling,
  computeSides,
  moveMindNode,
  removeBranch,
  renameMindNode,
} from '../../src/domain/mindmap';
import { DomainError } from '../../src/domain/operations';

const root = createMindmap('Prueba', 'r', 'Raíz');
const tree = addChild(
  addSibling(addChild(addChild(root, 'r', { id: 'a', label: 'A' }), 'a', { id: 'a1', label: 'A1' }), 'a', {
    id: 'b',
    label: 'B',
  }),
  'b',
  { id: 'b1', label: 'B1' },
);

describe('addChild', () => {
  it('cuelga el nodo del padre sin mutar el original', () => {
    const next = addChild(root, 'r', { id: 'a', label: 'A' });
    expect(next.nodes[1]).toEqual({ id: 'a', label: 'A', parent: 'r' });
    expect(root.nodes).toHaveLength(1);
  });

  it('rechaza un padre inexistente o un id repetido', () => {
    expect(() => addChild(root, 'zzz', { id: 'a', label: 'A' })).toThrow(DomainError);
    expect(() => addChild(root, 'r', { id: 'r', label: 'otra raíz' })).toThrow(DomainError);
  });
});

describe('addSibling', () => {
  it('comparte padre con el nodo de referencia y queda justo después de él', () => {
    const ids = tree.nodes.map((node) => node.id);
    expect(tree.nodes.find((node) => node.id === 'b')?.parent).toBe('r');
    expect(ids.indexOf('b')).toBe(ids.indexOf('a') + 1);
  });

  it('la raíz no tiene hermanos', () => {
    expect(() => addSibling(root, 'r', { id: 'x', label: 'X' })).toThrow(DomainError);
  });
});

describe('computeSides', () => {
  it('alterna las ramas de primer nivel y los descendientes heredan el lado', () => {
    const sides = computeSides(tree);
    expect(sides).toEqual({ a: 'right', a1: 'right', b: 'left', b1: 'left' });
  });

  it('la raíz no tiene lado', () => {
    expect(computeSides(root)).toEqual({});
  });
});

describe('removeBranch', () => {
  it('borra el nodo y todos sus descendientes', () => {
    const next = removeBranch(tree, 'a');
    expect(next.nodes.map((node) => node.id)).toEqual(['r', 'b', 'b1']);
  });

  it('no permite borrar la raíz', () => {
    expect(() => removeBranch(tree, 'r')).toThrow(DomainError);
  });
});

describe('renameMindNode, moveMindNode y clearPositions', () => {
  it('renombra y mueve un nodo', () => {
    const next = moveMindNode(renameMindNode(tree, 'a', 'Nuevo'), 'a', { x: 5, y: 6 });
    expect(next.nodes.find((node) => node.id === 'a')).toMatchObject({
      label: 'Nuevo',
      position: { x: 5, y: 6 },
    });
  });

  it('clearPositions descarta las posiciones manuales', () => {
    const moved = moveMindNode(tree, 'a', { x: 5, y: 6 });
    const cleared = clearPositions(moved);
    expect(cleared.nodes.every((node) => !('position' in node))).toBe(true);
  });
});
