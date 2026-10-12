import { exampleFlowchart, exampleMindmap, parseDiagram } from '@trazo/core';
import { describe, expect, it } from 'vitest';
import { JsonExporter } from '../../src/adapters/export/JsonExporter';

describe('JsonExporter', () => {
  const exporter = new JsonExporter();

  it.each([
    ['diagrama de flujo', exampleFlowchart, 'inicio-de-sesion.json'],
    ['mapa mental', exampleMindmap, 'plan-de-portafolio.json'],
  ])('exporta un %s como un JSON que Trazo puede volver a abrir', async (_name, diagram, fileName) => {
    const file = await exporter.export({ diagram, positions: {} });
    expect(file.fileName).toBe(fileName);
    expect(file.mimeType).toBe('application/json');
    expect(typeof file.data).toBe('string');
    expect(parseDiagram(file.data as string)).toEqual({ ok: true, diagram });
  });

  it('usa un nombre por defecto si el diagrama no tiene título', async () => {
    const file = await exporter.export({ diagram: { ...exampleFlowchart, title: '' }, positions: {} });
    expect(file.fileName).toBe('diagrama.json');
  });
});
