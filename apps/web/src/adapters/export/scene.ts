import {
  computeSides,
  type ExportRequest,
  type FlowchartDiagram,
  type MindmapDiagram,
  type NodeKind,
  type Position,
  type Side,
} from '@trazo/core';
import { Position as FlowSide, getBezierPath, getSmoothStepPath } from '@xyflow/react';
import { handlePoint, mindBranches, pickHandles } from '../../shared/geometry';
import { FLOW_HEIGHT, FLOW_WIDTH, MIND_NODE, MIND_ROOT } from '../../shared/nodeSizes';
import type { Palette } from './palette';

export interface SceneOptions {
  palette: Palette;
  measure: (text: string, font: string) => number;
  fontCss: string;
}

export interface Scene {
  svg: string;
  width: number;
  height: number;
}

interface Box {
  position: Position;
  width: number;
  height: number;
}

const SANS = "'Geist', ui-sans-serif, system-ui, sans-serif";
const DISPLAY = "'Sora', ui-sans-serif, system-ui, sans-serif";
const MONO = "'Geist Mono', ui-monospace, monospace";
const PADDING = 56;

const FLOW_SIDE: Record<Side, FlowSide> = {
  top: FlowSide.Top,
  right: FlowSide.Right,
  bottom: FlowSide.Bottom,
  left: FlowSide.Left,
};
const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function mix(foreground: string, background: string, share: number): string {
  const channels = (hex: string) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  const front = channels(foreground);
  const back = channels(background);
  const blended = front.map((value, index) => Math.round(value * share + (back[index] ?? 0) * (1 - share)));
  return `#${blended.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function luminance(hex: string): number {
  const [red = 0, green = 0, blue = 0] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: string, second: string): number {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

// Texto oscuro o blanco: el que dé más contraste (relación WCAG) sobre un color sólido.
function readableOn(background: string): string {
  const dark = '#14142a';
  return contrast(background, dark) >= contrast(background, '#ffffff') ? dark : '#ffffff';
}

function wrap(text: string, maxWidth: number, font: string, measure: SceneOptions['measure']): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate, font) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) {
    lines.push(current);
  }
  const visible = lines.slice(0, 2);
  if (lines.length > 2 || (visible[1] && measure(visible[1], font) > maxWidth)) {
    let last = visible[1] ?? visible[0] ?? '';
    while (last.length > 1 && measure(`${last}…`, font) > maxWidth) {
      last = last.slice(0, -1);
    }
    visible[visible.length - 1] = `${last}…`;
  }
  return visible.length > 0 ? visible : [''];
}

interface TextStyle {
  font: string;
  family: string;
  weight: number;
  size: number;
  fill: string;
}

function textBlock(
  text: string,
  center: Position,
  maxWidth: number,
  style: TextStyle,
  measure: SceneOptions['measure'],
): string {
  const lineHeight = style.size * 1.25;
  const lines = wrap(text, maxWidth, style.font, measure);
  const firstBaseline = center.y - ((lines.length - 1) * lineHeight) / 2 + style.size * 0.35;
  const spans = lines
    .map((line, index) => `<tspan x="${round(center.x)}" y="${round(firstBaseline + index * lineHeight)}">${escapeXml(line)}</tspan>`)
    .join('');
  return `<text text-anchor="middle" font-family="${style.family}" font-weight="${style.weight}" font-size="${style.size}" fill="${style.fill}">${spans}</text>`;
}

function centerOf(box: Box): Position {
  return { x: box.position.x + box.width / 2, y: box.position.y + box.height / 2 };
}

function flowchartParts(diagram: FlowchartDiagram, positions: Record<string, Position>, options: SceneOptions) {
  const { palette, measure } = options;
  const kindColor: Record<NodeKind, string> = {
    start: palette.secondary,
    process: palette.primary,
    decision: palette.accent,
    end: palette.hot,
  };
  const boxes = new Map<string, Box>();
  for (const node of diagram.nodes) {
    const position = node.position ?? positions[node.id];
    if (position) {
      boxes.set(node.id, { position, width: FLOW_WIDTH, height: FLOW_HEIGHT[node.kind] });
    }
  }

  const edges = diagram.edges.flatMap((edge) => {
    const from = boxes.get(edge.from);
    const to = boxes.get(edge.to);
    const fromNode = diagram.nodes.find((node) => node.id === edge.from);
    if (!from || !to) {
      return [];
    }
    const picked = pickHandles(from.position, to.position, fromNode?.kind);
    const fromSide = edge.fromSide ?? picked.sourceHandle;
    const toSide = edge.toSide ?? picked.targetHandle;
    const source = handlePoint(from.position, from, fromSide);
    const target = handlePoint(to.position, to, toSide);
    const [path, labelX, labelY] = getSmoothStepPath({
      sourceX: source.x,
      sourceY: source.y,
      sourcePosition: FLOW_SIDE[fromSide],
      targetX: target.x,
      targetY: target.y,
      targetPosition: FLOW_SIDE[toSide],
      borderRadius: 14,
    });
    const line = `<path d="${path}" fill="none" stroke="${palette.edge}" stroke-width="2" marker-end="url(#arrow)"/>`;
    if (!edge.label) {
      return [line];
    }
    const font = `500 12px ${MONO}`;
    const width = measure(edge.label, font) + 18;
    const pill = `<rect x="${round(labelX - width / 2)}" y="${round(labelY - 11)}" width="${round(width)}" height="22" rx="11" fill="${palette.bg}"/>`;
    const text = `<text x="${round(labelX)}" y="${round(labelY + 4)}" text-anchor="middle" font-family="${MONO}" font-weight="500" font-size="12" fill="${palette.ink}">${escapeXml(edge.label)}</text>`;
    return [line, pill, text];
  });

  const nodes = diagram.nodes.flatMap((node) => {
    const box = boxes.get(node.id);
    if (!box) {
      return [];
    }
    const { x, y } = box.position;
    const color = kindColor[node.kind];
    const fill = mix(color, palette.surface, 0.16);
    const center = centerOf(box);
    const style: TextStyle = {
      font: `600 15.2px ${SANS}`,
      family: SANS,
      weight: 600,
      size: 15.2,
      fill: palette.ink,
    };
    let shape: string;
    let textWidth = box.width - 42;
    if (node.kind === 'decision') {
      const points = [
        [x + box.width / 2, y + 1],
        [x + box.width - 1, y + box.height / 2],
        [x + box.width / 2, y + box.height - 1],
        [x + 1, y + box.height / 2],
      ]
        .map(([px, py]) => `${round(px ?? 0)},${round(py ?? 0)}`)
        .join(' ');
      shape = `<polygon points="${points}" fill="${fill}" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>`;
      textWidth = box.width - 96;
    } else {
      const radius = node.kind === 'process' ? 14 : box.height / 2;
      shape = `<rect x="${x + 0.75}" y="${y + 0.75}" width="${box.width - 1.5}" height="${box.height - 1.5}" rx="${radius}" fill="${fill}" stroke="${color}" stroke-width="1.5"/>`;
    }
    return [shape, textBlock(node.label, center, textWidth, style, measure)];
  });

  return { boxes: [...boxes.values()], edges, nodes };
}

function mindmapParts(diagram: MindmapDiagram, positions: Record<string, Position>, options: SceneOptions) {
  const { palette, measure } = options;
  const branchColors = [palette.secondary, palette.accent, palette.hot, palette.primary];
  const colorOf = (branch: string) => (branch === 'root' ? palette.primary : (branchColors[Number(branch)] ?? palette.primary));
  const sides = computeSides(diagram);
  const branches = mindBranches(diagram);

  const boxes = new Map<string, Box>();
  for (const node of diagram.nodes) {
    const position = node.position ?? positions[node.id];
    const size = node.parent === null ? MIND_ROOT : MIND_NODE;
    if (position) {
      boxes.set(node.id, { position, ...size });
    }
  }

  const edges = diagram.nodes.flatMap((node) => {
    const parent = node.parent === null ? undefined : boxes.get(node.parent);
    const child = boxes.get(node.id);
    if (!parent || !child) {
      return [];
    }
    const exit: Side = sides[node.id] === 'left' ? 'left' : 'right';
    const source = handlePoint(parent.position, parent, exit);
    const target = handlePoint(child.position, child, OPPOSITE[exit]);
    const [path] = getBezierPath({
      sourceX: source.x,
      sourceY: source.y,
      sourcePosition: FLOW_SIDE[exit],
      targetX: target.x,
      targetY: target.y,
      targetPosition: FLOW_SIDE[OPPOSITE[exit]],
    });
    const color = colorOf(branches.get(node.id)?.branch ?? '0');
    return [`<path d="${path}" fill="none" stroke="${color}" stroke-width="2.5"/>`];
  });

  const nodes = diagram.nodes.flatMap((node) => {
    const box = boxes.get(node.id);
    if (!box) {
      return [];
    }
    const { x, y } = box.position;
    const info = branches.get(node.id);
    const color = colorOf(info?.branch ?? 'root');
    const center = centerOf(box);
    const textWidth = box.width - 32;
    if ((info?.depth ?? 0) === 0) {
      const style: TextStyle = { font: `800 18.4px ${DISPLAY}`, family: DISPLAY, weight: 800, size: 18.4, fill: palette.onPrimary };
      return [
        `<rect x="${x}" y="${y}" width="${box.width}" height="${box.height}" rx="19.2" fill="${palette.primary}"/>`,
        textBlock(node.label, center, textWidth, style, measure),
      ];
    }
    const depth = info?.depth ?? 1;
    const solid = depth === 1;
    const style: TextStyle = {
      font: `${solid ? 700 : 600} 14.7px ${SANS}`,
      family: SANS,
      weight: solid ? 700 : 600,
      size: 14.7,
      fill: solid ? readableOn(color) : palette.ink,
    };
    const fill = solid ? color : mix(color, palette.surface, depth === 2 ? 0.46 : 0.27);
    const stroke = depth >= 3 ? mix(color, palette.bg, 0.75) : color;
    return [
      `<rect x="${x + 0.75}" y="${y + 0.75}" width="${box.width - 1.5}" height="${box.height - 1.5}" rx="${box.height / 2}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
      textBlock(node.label, center, textWidth, style, measure),
    ];
  });

  return { boxes: [...boxes.values()], edges, nodes };
}

export function buildSvg({ diagram, positions }: ExportRequest, options: SceneOptions): Scene {
  const parts =
    diagram.type === 'flowchart'
      ? flowchartParts(diagram, positions, options)
      : mindmapParts(diagram, positions, options);

  const xs = parts.boxes.flatMap((box) => [box.position.x, box.position.x + box.width]);
  const ys = parts.boxes.flatMap((box) => [box.position.y, box.position.y + box.height]);
  const minX = (xs.length > 0 ? Math.min(...xs) : 0) - PADDING;
  const minY = (ys.length > 0 ? Math.min(...ys) : 0) - PADDING;
  const width = Math.ceil((xs.length > 0 ? Math.max(...xs) : 0) + PADDING - minX);
  const height = Math.ceil((ys.length > 0 ? Math.max(...ys) : 0) + PADDING - minY);
  const { palette, fontCss } = options;

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${round(minX)} ${round(minY)} ${width} ${height}">`,
    `<title>${escapeXml(diagram.title || 'Diagrama')}</title>`,
    '<defs>',
    fontCss ? `<style><![CDATA[${fontCss}]]></style>` : '',
    `<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${palette.edge}"/></marker>`,
    '</defs>',
    `<rect x="${round(minX)}" y="${round(minY)}" width="${width}" height="${height}" fill="${palette.bg}"/>`,
    ...parts.edges,
    ...parts.nodes,
    '</svg>',
  ]
    .filter(Boolean)
    .join('\n');

  return { svg, width, height };
}
