import { describe, expect, it } from 'vitest';
import { createDiagram } from '../../src/domain/diagram';
import {
  DomainError,
  addNode,
  connect,
  moveNode,
  reconnectEdge,
  removeEdge,
  removeNode,
  updateEdgeLabel,
  updateNode,
} from '../../src/domain/operations';

const base = addNode(
  addNode(createDiagram('Prueba'), { id: 'a', kind: 'start', label: 'A' }),
  { id: 'b', kind: 'process', label: 'B' },
);

describe('addNode', () => {
  it('agrega el nodo sin mutar el diagrama original', () => {
    const empty = createDiagram('Vacío');
    const next = addNode(empty, { id: 'a', kind: 'start', label: 'A' });
    expect(next.nodes).toHaveLength(1);
    expect(empty.nodes).toHaveLength(0);
  });

  it('rechaza un id repetido', () => {
    expect(() => addNode(base, { id: 'a', kind: 'end', label: 'Otro' })).toThrow(DomainError);
  });
});

describe('updateNode y moveNode', () => {
  it('cambia la etiqueta y el tipo', () => {
    const next = updateNode(base, 'a', { label: 'Nueva', kind: 'decision' });
    expect(next.nodes[0]).toMatchObject({ label: 'Nueva', kind: 'decision' });
  });

  it('mueve el nodo', () => {
    const next = moveNode(base, 'b', { x: 10, y: 20 });
    expect(next.nodes[1]?.position).toEqual({ x: 10, y: 20 });
  });

  it('falla con un nodo inexistente', () => {
    expect(() => moveNode(base, 'zzz', { x: 0, y: 0 })).toThrow(DomainError);
    expect(() => updateNode(base, 'zzz', { label: 'x' })).toThrow(DomainError);
  });
});

describe('connect y removeNode', () => {
  const linked = connect(base, { id: 'e1', from: 'a', to: 'b' });

  it('crea la conexión', () => {
    expect(linked.edges).toHaveLength(1);
  });

  it('ignora una conexión duplicada', () => {
    expect(connect(linked, { id: 'e2', from: 'a', to: 'b' })).toBe(linked);
  });

  it('rechaza conexiones a nodos inexistentes', () => {
    expect(() => connect(base, { id: 'e9', from: 'a', to: 'zzz' })).toThrow(DomainError);
  });

  it('al borrar un nodo borra sus conexiones', () => {
    const next = removeNode(linked, 'a');
    expect(next.nodes.map((node) => node.id)).toEqual(['b']);
    expect(next.edges).toHaveLength(0);
  });

  it('borra una conexión sin tocar los nodos', () => {
    const next = removeEdge(linked, 'e1');
    expect(next.edges).toHaveLength(0);
    expect(next.nodes).toHaveLength(2);
  });
});

describe('reconnectEdge', () => {
  const linked = connect(base, { id: 'e1', from: 'a', to: 'b', label: 'Sí', fromSide: 'right' });

  it('cambia el lado de salida conservando id y etiqueta', () => {
    const next = reconnectEdge(linked, 'e1', { from: 'a', to: 'b', fromSide: 'bottom', toSide: 'top' });
    expect(next.edges[0]).toEqual({
      id: 'e1',
      from: 'a',
      to: 'b',
      label: 'Sí',
      fromSide: 'bottom',
      toSide: 'top',
    });
  });

  it('sin lados vuelve al cálculo automático', () => {
    const next = reconnectEdge(linked, 'e1', { from: 'a', to: 'b' });
    expect(next.edges[0]).not.toHaveProperty('fromSide');
  });

  it('rechaza nodos o conexiones inexistentes', () => {
    expect(() => reconnectEdge(linked, 'e1', { from: 'a', to: 'zzz' })).toThrow(DomainError);
    expect(() => reconnectEdge(linked, 'e9', { from: 'a', to: 'b' })).toThrow(DomainError);
  });
});

describe('updateEdgeLabel', () => {
  const linked = connect(base, { id: 'e1', from: 'a', to: 'b' });

  it('asigna y quita la etiqueta', () => {
    const labeled = updateEdgeLabel(linked, 'e1', 'Sí');
    expect(labeled.edges[0]?.label).toBe('Sí');
    const cleared = updateEdgeLabel(labeled, 'e1', '');
    expect(cleared.edges[0]).not.toHaveProperty('label');
  });
});
