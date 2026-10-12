import { parseDiagram } from '@trazo/core';
import { describe, expect, it } from 'vitest';

const raw = import.meta.glob('../../../../fixtures/diagramas/**/*.json', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const byName = (folder: string) =>
  Object.entries(raw)
    .filter(([path]) => path.includes(`/${folder}/`))
    .map(([path, text]) => ({ name: path.split('/').at(-1) ?? path, text }));

const valid = byName('validos');
const invalid = byName('invalidos');

function errorsOf(name: string): string[] {
  const file = invalid.find((candidate) => candidate.name === name);
  const result = parseDiagram(file?.text ?? '');
  if (result.ok) {
    throw new Error(`${name} debería ser inválido`);
  }
  return result.errors;
}

describe('diagramas de prueba (fixtures/diagramas)', () => {
  it('hay 4 válidos y 5 inválidos', () => {
    expect(valid.map((file) => file.name).sort()).toEqual([
      'flujo-con-posiciones.json',
      'flujo-simple.json',
      'mapa-mental-grande.json',
      'mapa-mental-simple.json',
    ]);
    expect(invalid).toHaveLength(5);
  });

  it.each(valid.map((file) => [file.name, file.text]))('%s es válido', (_name, text) => {
    expect(parseDiagram(text as string).ok).toBe(true);
  });

  it('el flujo con posiciones las trae todas y el simple ninguna', () => {
    const withPositions = parseDiagram(valid.find((f) => f.name === 'flujo-con-posiciones.json')?.text ?? '');
    const simple = parseDiagram(valid.find((f) => f.name === 'flujo-simple.json')?.text ?? '');
    expect(withPositions.ok && withPositions.diagram.nodes.every((node) => node.position)).toBe(true);
    expect(simple.ok && simple.diagram.nodes.some((node) => node.position)).toBe(false);
  });

  it('el mapa mental grande tiene 81 nodos (el caso de 50 nodos del RFC)', () => {
    const big = parseDiagram(valid.find((f) => f.name === 'mapa-mental-grande.json')?.text ?? '');
    expect(big.ok && big.diagram.nodes.length).toBe(81);
  });

  it.each(invalid.map((file) => [file.name, file.text]))('%s es inválido', (_name, text) => {
    const result = parseDiagram(text as string);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.length).toBeGreaterThan(0);
  });

  it('cada inválido falla por su motivo, con un mensaje claro', () => {
    expect(errorsOf('json-roto.json')).toEqual(['El archivo no es JSON válido']);
    expect(errorsOf('sin-version.json')[0]).toMatch(/^version:/);
    expect(errorsOf('tipo-desconocido.json')).toContain('type: debe ser flowchart o mindmap');
    expect(errorsOf('arista-huerfana.json')).toContain('edges[0].to: el nodo "fantasma" no existe');
    expect(errorsOf('padre-inexistente.json')).toContain('nodes[1].parent: el nodo "fantasma" no existe');
  });
});
