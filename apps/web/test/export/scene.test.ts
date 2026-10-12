import { exampleFlowchart, exampleMindmap } from '@trazo/core';
import { describe, expect, it } from 'vitest';
import { buildSvg, type SceneOptions } from '../../src/adapters/export/scene';

const options: SceneOptions = {
  palette: {
    bg: '#101020',
    surface: '#1a1a30',
    ink: '#f0f0ff',
    muted: '#9a9ab8',
    primary: '#7c5cff',
    onPrimary: '#0d0d1a',
    secondary: '#3dd6f5',
    accent: '#f0b030',
    hot: '#ff4d9d',
    edge: '#8888aa',
  },
  measure: (text) => text.length * 8,
  fontCss: '',
};

describe('buildSvg: diagrama de flujo', () => {
  const { svg, width, height } = buildSvg({ diagram: exampleFlowchart, positions: {} }, options);

  it('es un SVG con tamaño y fondo', () => {
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    expect(svg).toContain(`fill="${options.palette.bg}"`);
  });

  it('dibuja todos los textos de nodos y etiquetas de conexión', () => {
    for (const node of exampleFlowchart.nodes) {
      expect(svg).toContain(node.label.split(' ')[0]);
    }
    expect(svg).toContain('>Sí<');
    expect(svg).toContain('>No<');
  });

  it('dibuja una conexión con flecha por cada arista', () => {
    expect(svg.match(/marker-end="url\(#arrow\)"/g)).toHaveLength(exampleFlowchart.edges.length);
  });

  it('usa una forma por tipo de nodo', () => {
    expect(svg.match(/<polygon /g)).toHaveLength(1);
    expect(svg.match(/<rect /g)?.length).toBeGreaterThanOrEqual(exampleFlowchart.nodes.length);
  });
});

describe('buildSvg: mapa mental', () => {
  const { svg } = buildSvg({ diagram: exampleMindmap, positions: {} }, {
    ...options,
    fontCss: '@font-face{font-family:Geist;src:url(data:font/woff2;base64,AAAA)}',
  });
  const withPositions = buildSvg(
    {
      diagram: exampleMindmap,
      positions: Object.fromEntries(exampleMindmap.nodes.map((node, index) => [node.id, { x: index * 240, y: (index % 3) * 80 }])),
    },
    options,
  ).svg;

  it('sin posiciones no dibuja nodos pero sigue siendo un SVG válido', () => {
    expect(svg).toContain('<svg');
    expect(svg).not.toContain('Portafolio');
  });

  it('embebe las fuentes cuando se le dan', () => {
    expect(svg).toContain('<![CDATA[@font-face');
  });

  it('con posiciones dibuja todos los nodos y una curva por rama', () => {
    for (const node of exampleMindmap.nodes) {
      expect(withPositions).toContain(node.label.split(' ')[0]);
    }
    expect(withPositions.match(/<path d="M[^"]+C/g)).toHaveLength(exampleMindmap.nodes.length - 1);
  });
});

describe('buildSvg: texto', () => {
  it('escapa los caracteres especiales del XML', () => {
    const diagram = {
      ...exampleFlowchart,
      nodes: [{ id: 'a', kind: 'process' as const, label: 'A & B <c> "d"', position: { x: 0, y: 0 } }],
      edges: [],
    };
    const { svg } = buildSvg({ diagram, positions: {} }, options);
    expect(svg).toContain('A &amp; B &lt;c&gt; &quot;d&quot;');
  });

  it('recorta con puntos suspensivos un texto que no cabe', () => {
    const label = 'palabra '.repeat(30).trim();
    const diagram = {
      ...exampleFlowchart,
      nodes: [{ id: 'a', kind: 'process' as const, label, position: { x: 0, y: 0 } }],
      edges: [],
    };
    expect(buildSvg({ diagram, positions: {} }, options).svg).toContain('…');
  });
});
