import type {
  Diagram,
  DiagramEdge,
  FlowNode,
  MindNode,
  NodeKind,
  Position,
  Side,
} from '../domain/diagram';

export const CURRENT_VERSION = 1;

export type ParseResult = { ok: true; diagram: Diagram } | { ok: false; errors: string[] };

type Raw = Record<string, unknown>;
export type Migration = (raw: Raw) => Raw;

export interface ValidateOptions {
  currentVersion?: number;
  migrations?: Readonly<Record<number, Migration>>;
}

const MAX_ERRORS = 10;
const NODE_KINDS: readonly string[] = ['start', 'process', 'decision', 'end'];
const SIDES: readonly string[] = ['top', 'right', 'bottom', 'left'];

// Migraciones desde la versión N a la N+1. Vacío mientras exista solo la v1.
const MIGRATIONS: Readonly<Record<number, Migration>> = {};

class Issues {
  readonly list: string[] = [];

  add(path: string, message: string): void {
    if (this.list.length < MAX_ERRORS) {
      this.list.push(`${path}: ${message}`);
    }
  }

  get any(): boolean {
    return this.list.length > 0;
  }
}

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(raw: Raw, key: string, path: string, issues: Issues): string | undefined {
  const value = raw[key];
  if (typeof value !== 'string') {
    issues.add(`${path}.${key}`, 'debe ser un texto');
    return undefined;
  }
  return value;
}

function readOptionalPosition(raw: Raw, path: string, issues: Issues): Position | undefined {
  const value = raw.position;
  if (value === undefined) {
    return undefined;
  }
  const isValid =
    isRecord(value) &&
    typeof value.x === 'number' &&
    Number.isFinite(value.x) &&
    typeof value.y === 'number' &&
    Number.isFinite(value.y);
  if (!isValid) {
    issues.add(`${path}.position`, 'debe ser un objeto con x e y numéricos');
    return undefined;
  }
  return { x: value.x as number, y: value.y as number };
}

function readOptionalSide(raw: Raw, key: 'fromSide' | 'toSide', path: string, issues: Issues): Side | undefined {
  const value = raw[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || !SIDES.includes(value)) {
    issues.add(`${path}.${key}`, 'debe ser top, right, bottom o left');
    return undefined;
  }
  return value as Side;
}

function readArray(raw: Raw, key: string, issues: Issues): unknown[] | undefined {
  const value = raw[key];
  if (!Array.isArray(value)) {
    issues.add(key, 'debe ser una lista');
    return undefined;
  }
  return value;
}

function validateFlowNodes(items: unknown[], issues: Issues): FlowNode[] {
  const seen = new Set<string>();
  const nodes: FlowNode[] = [];
  items.forEach((item, index) => {
    const path = `nodes[${index}]`;
    if (!isRecord(item)) {
      issues.add(path, 'debe ser un objeto');
      return;
    }
    const id = readString(item, 'id', path, issues);
    const label = readString(item, 'label', path, issues);
    const kind = item.kind;
    if (typeof kind !== 'string' || !NODE_KINDS.includes(kind)) {
      issues.add(`${path}.kind`, 'debe ser start, process, decision o end');
    }
    const position = readOptionalPosition(item, path, issues);
    if (id !== undefined && seen.has(id)) {
      issues.add(`${path}.id`, `el id "${id}" está repetido`);
    } else if (id !== undefined) {
      seen.add(id);
    }
    if (id !== undefined && label !== undefined && typeof kind === 'string' && NODE_KINDS.includes(kind)) {
      nodes.push({ id, label, kind: kind as NodeKind, ...(position && { position }) });
    }
  });
  return nodes;
}

function validateEdges(items: unknown[], nodes: readonly FlowNode[], issues: Issues): DiagramEdge[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const seen = new Set<string>();
  const edges: DiagramEdge[] = [];
  items.forEach((item, index) => {
    const path = `edges[${index}]`;
    if (!isRecord(item)) {
      issues.add(path, 'debe ser un objeto');
      return;
    }
    const id = readString(item, 'id', path, issues);
    const from = readString(item, 'from', path, issues);
    const to = readString(item, 'to', path, issues);
    const fromSide = readOptionalSide(item, 'fromSide', path, issues);
    const toSide = readOptionalSide(item, 'toSide', path, issues);
    if (item.label !== undefined && typeof item.label !== 'string') {
      issues.add(`${path}.label`, 'debe ser un texto');
    }
    if (from !== undefined && !nodeIds.has(from)) {
      issues.add(`${path}.from`, `el nodo "${from}" no existe`);
    }
    if (to !== undefined && !nodeIds.has(to)) {
      issues.add(`${path}.to`, `el nodo "${to}" no existe`);
    }
    if (id !== undefined && seen.has(id)) {
      issues.add(`${path}.id`, `el id "${id}" está repetido`);
    } else if (id !== undefined) {
      seen.add(id);
    }
    const label = typeof item.label === 'string' ? item.label : undefined;
    if (
      id !== undefined &&
      from !== undefined &&
      to !== undefined &&
      nodeIds.has(from) &&
      nodeIds.has(to)
    ) {
      edges.push({
        id,
        from,
        to,
        ...(fromSide && { fromSide }),
        ...(toSide && { toSide }),
        ...(label && { label }),
      });
    }
  });
  return edges;
}

function validateMindNodes(items: unknown[], issues: Issues): MindNode[] {
  const seen = new Set<string>();
  const nodes: MindNode[] = [];
  items.forEach((item, index) => {
    const path = `nodes[${index}]`;
    if (!isRecord(item)) {
      issues.add(path, 'debe ser un objeto');
      return;
    }
    const id = readString(item, 'id', path, issues);
    const label = readString(item, 'label', path, issues);
    const parent = item.parent;
    const hasValidParent = parent === null || typeof parent === 'string';
    if (!hasValidParent) {
      issues.add(`${path}.parent`, 'debe ser el id del padre o null en la raíz');
    }
    const position = readOptionalPosition(item, path, issues);
    if (id !== undefined && seen.has(id)) {
      issues.add(`${path}.id`, `el id "${id}" está repetido`);
    } else if (id !== undefined) {
      seen.add(id);
    }
    if (id !== undefined && label !== undefined && hasValidParent) {
      nodes.push({ id, label, parent: parent as string | null, ...(position && { position }) });
    }
  });
  return nodes;
}

function validateMindTree(nodes: readonly MindNode[], issues: Issues): void {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const roots = nodes.filter((node) => node.parent === null);
  if (roots.length !== 1) {
    issues.add('nodes', `debe haber exactamente una raíz (parent null) y hay ${roots.length}`);
  }
  nodes.forEach((node, index) => {
    if (node.parent !== null && !byId.has(node.parent)) {
      issues.add(`nodes[${index}].parent`, `el nodo "${node.parent}" no existe`);
    }
  });
  if (issues.any) {
    return;
  }
  for (const node of nodes) {
    let current: MindNode | undefined = node;
    let steps = 0;
    while (current && current.parent !== null && steps <= nodes.length) {
      current = byId.get(current.parent);
      steps += 1;
    }
    if (steps > nodes.length) {
      issues.add('nodes', `el nodo "${node.id}" forma un ciclo de padres`);
      return;
    }
  }
}

function migrate(raw: Raw, options: Required<ValidateOptions>, issues: Issues): Raw | undefined {
  const { currentVersion, migrations } = options;
  let version = raw.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    issues.add('version', 'falta o no es un entero válido');
    return undefined;
  }
  if (version > currentVersion) {
    issues.add(
      'version',
      `el archivo es de la versión ${version} y esta app entiende hasta la ${currentVersion}; actualiza la app`,
    );
    return undefined;
  }
  let current = raw;
  while (version < currentVersion) {
    const step = migrations[version];
    if (!step) {
      issues.add('version', `no hay migración desde la versión ${version}`);
      return undefined;
    }
    version += 1;
    current = { ...step(current), version };
  }
  return current;
}

export function validateDiagram(input: unknown, options: ValidateOptions = {}): ParseResult {
  const issues = new Issues();
  if (!isRecord(input)) {
    return { ok: false, errors: ['El archivo no contiene un diagrama (se esperaba un objeto JSON)'] };
  }
  const resolved: Required<ValidateOptions> = {
    currentVersion: options.currentVersion ?? CURRENT_VERSION,
    migrations: options.migrations ?? MIGRATIONS,
  };
  const raw = migrate(input, resolved, issues);
  if (!raw) {
    return { ok: false, errors: issues.list };
  }

  const title = readString(raw, 'title', '', issues)?.trim() ?? '';
  const items = readArray(raw, 'nodes', issues);
  const version = resolved.currentVersion as 1;

  if (raw.type === 'flowchart' && items) {
    const nodes = validateFlowNodes(items, issues);
    const edgeItems = readArray(raw, 'edges', issues);
    const edges = edgeItems ? validateEdges(edgeItems, nodes, issues) : [];
    if (issues.any) {
      return { ok: false, errors: issues.list };
    }
    return { ok: true, diagram: { version, type: 'flowchart', title, nodes, edges } };
  }
  if (raw.type === 'mindmap' && items) {
    const nodes = validateMindNodes(items, issues);
    validateMindTree(nodes, issues);
    if (issues.any) {
      return { ok: false, errors: issues.list };
    }
    return { ok: true, diagram: { version, type: 'mindmap', title, nodes } };
  }
  if (raw.type !== 'flowchart' && raw.type !== 'mindmap') {
    issues.add('type', 'debe ser flowchart o mindmap');
  }
  return { ok: false, errors: issues.list };
}

export function parseDiagram(text: string, options?: ValidateOptions): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['El archivo no es JSON válido'] };
  }
  return validateDiagram(raw, options);
}

export function serializeDiagram(diagram: Diagram): string {
  return `${JSON.stringify(diagram, null, 2)}\n`;
}
