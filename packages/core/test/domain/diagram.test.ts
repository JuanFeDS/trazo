import { describe, expect, it } from 'vitest';
import { createFlowchart, createMindmap, setTitle } from '../../src/domain/diagram';

describe('setTitle', () => {
  it('cambia el título sin mutar el diagrama original', () => {
    const original = createFlowchart('Antes');
    const renamed = setTitle(original, 'Después');
    expect(renamed.title).toBe('Después');
    expect(original.title).toBe('Antes');
  });

  it('conserva el tipo concreto del diagrama', () => {
    const mindmap = setTitle(createMindmap('A', 'r', 'Raíz'), 'B');
    expect(mindmap.type).toBe('mindmap');
    expect(mindmap.nodes).toHaveLength(1);
  });
});
