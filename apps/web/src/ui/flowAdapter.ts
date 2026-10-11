import {
  computeSides,
  type Diagram,
  type EdgeEndpoints,
  type FlowchartDiagram,
  type MindmapDiagram,
  type Position,
  type Side,
} from '@trazo/core';
import { MarkerType, type Connection, type Edge, type Node } from '@xyflow/react';
import { FLOW_HEIGHT, FLOW_WIDTH, MIND_NODE, MIND_ROOT } from '../nodeSizes';

export interface TrazoNodeData extends Record<string, unknown> {
  label: string;
  kind?: string;
  branch?: string;
  depth?: number;
}

export interface TrazoEdgeData extends Record<string, unknown> {
  label?: string;
  branch?: string;
}

export type TrazoNode = Node<TrazoNodeData, 'trazo' | 'mind'>;
export type TrazoEdge = Edge<TrazoEdgeData, 'trazo' | 'mind'>;

export type PositionMap = Record<string, Position>;

const BRANCH_COLORS = 4;
const VERTICAL_BIAS = 0.6;
// Una decisión solo sale por el costado si el destino queda desplazado al menos media anchura.
const DECISION_SIDE_EXIT = FLOW_WIDTH / 2;
const SIDES: readonly string[] = ['top', 'right', 'bottom', 'left'];

function asSide(handle: string | null | undefined): Side | undefined {
  return handle && SIDES.includes(handle) ? (handle as Side) : undefined;
}

export function toEndpoints(connection: Connection): EdgeEndpoints | null {
  if (connection.source === connection.target) {
    return null;
  }
  const fromSide = asSide(connection.sourceHandle);
  const toSide = asSide(connection.targetHandle);
  return {
    from: connection.source,
    to: connection.target,
    ...(fromSide && { fromSide }),
    ...(toSide && { toSide }),
  };
}

function pickHandles(
  from?: Position,
  to?: Position,
  fromKind?: string,
): { sourceHandle: string; targetHandle: string } {
  const deltaX = (to?.x ?? 0) - (from?.x ?? 0);
  const deltaY = (to?.y ?? 0) - (from?.y ?? 0);
  if (deltaY < 0) {
    return { sourceHandle: 'right', targetHandle: 'right' };
  }
  if (fromKind === 'decision' && Math.abs(deltaX) >= DECISION_SIDE_EXIT) {
    return { sourceHandle: deltaX > 0 ? 'right' : 'left', targetHandle: 'top' };
  }
  if (Math.abs(deltaY) >= Math.abs(deltaX) * VERTICAL_BIAS) {
    return { sourceHandle: 'bottom', targetHandle: 'top' };
  }
  return deltaX >= 0
    ? { sourceHandle: 'right', targetHandle: 'left' }
    : { sourceHandle: 'left', targetHandle: 'right' };
}

function mindBranches(diagram: MindmapDiagram): Map<string, { branch: string; depth: number }> {
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const rootChildren = diagram.nodes.filter((node) => node.parent !== null && byId.get(node.parent)?.parent === null);
  const result = new Map<string, { branch: string; depth: number }>();

  for (const node of diagram.nodes) {
    let depth = 0;
    let ancestor = node;
    while (ancestor.parent !== null) {
      const next = byId.get(ancestor.parent);
      if (!next) {
        break;
      }
      ancestor = next;
      depth += 1;
    }
    if (depth === 0) {
      result.set(node.id, { branch: 'root', depth });
      continue;
    }
    let topLevel = node;
    for (let step = depth; step > 1; step -= 1) {
      topLevel = byId.get(topLevel.parent ?? '') ?? topLevel;
    }
    const index = rootChildren.findIndex((candidate) => candidate.id === topLevel.id);
    result.set(node.id, { branch: String(Math.max(index, 0) % BRANCH_COLORS), depth });
  }
  return result;
}

function flowchartNodes(
  diagram: FlowchartDiagram,
  previous: TrazoNode[],
  auto: PositionMap,
  selectedIds: string[],
): TrazoNode[] {
  return diagram.nodes.flatMap((node) => {
    const position = node.position ?? auto[node.id];
    if (!position) {
      return [];
    }
    const existing = previous.find((candidate) => candidate.id === node.id);
    return [
      {
        ...existing,
        id: node.id,
        type: 'trazo' as const,
        position,
        initialWidth: FLOW_WIDTH,
        initialHeight: FLOW_HEIGHT[node.kind],
        selected: selectedIds.includes(node.id),
        data: { label: node.label, kind: node.kind },
      },
    ];
  });
}

function mindmapNodes(
  diagram: MindmapDiagram,
  previous: TrazoNode[],
  auto: PositionMap,
  selectedIds: string[],
): TrazoNode[] {
  const branches = mindBranches(diagram);
  return diagram.nodes.flatMap((node) => {
    const position = node.position ?? auto[node.id];
    if (!position) {
      return [];
    }
    const existing = previous.find((candidate) => candidate.id === node.id);
    const info = branches.get(node.id);
    return [
      {
        ...existing,
        id: node.id,
        type: 'mind' as const,
        position,
        initialWidth: (node.parent === null ? MIND_ROOT : MIND_NODE).width,
        initialHeight: (node.parent === null ? MIND_ROOT : MIND_NODE).height,
        selected: selectedIds.includes(node.id),
        deletable: node.parent !== null,
        data: { label: node.label, branch: info?.branch ?? 'root', depth: info?.depth ?? 0 },
      },
    ];
  });
}

export function mergeNodes(
  diagram: Diagram,
  previous: TrazoNode[],
  auto: PositionMap,
  selectedIds: string[],
): TrazoNode[] {
  return diagram.type === 'flowchart'
    ? flowchartNodes(diagram, previous, auto, selectedIds)
    : mindmapNodes(diagram, previous, auto, selectedIds);
}

function flowchartEdges(diagram: FlowchartDiagram, previous: TrazoEdge[], auto: PositionMap): TrazoEdge[] {
  const laidOut = new Set(
    diagram.nodes.filter((node) => node.position ?? auto[node.id]).map((node) => node.id),
  );
  return diagram.edges
    .filter((edge) => laidOut.has(edge.from) && laidOut.has(edge.to))
    .map((edge) => {
      const existing = previous.find((candidate) => candidate.id === edge.id);
      const fromNode = diagram.nodes.find((node) => node.id === edge.from);
      const toNode = diagram.nodes.find((node) => node.id === edge.to);
      return {
        ...existing,
        id: edge.id,
        type: 'trazo' as const,
        source: edge.from,
        target: edge.to,
        ...pickHandles(
          fromNode?.position ?? auto[edge.from],
          toNode?.position ?? auto[edge.to],
          fromNode?.kind,
        ),
        ...(edge.fromSide && { sourceHandle: edge.fromSide }),
        ...(edge.toSide && { targetHandle: edge.toSide }),
        data: edge.label ? { label: edge.label } : {},
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--edge-color)', width: 18, height: 18 },
      };
    });
}

function mindmapEdges(diagram: MindmapDiagram, auto: PositionMap): TrazoEdge[] {
  const branches = mindBranches(diagram);
  const sides = computeSides(diagram);
  return diagram.nodes.flatMap((node) => {
    const parent = diagram.nodes.find((candidate) => candidate.id === node.parent);
    if (!parent || !(node.position ?? auto[node.id]) || !(parent.position ?? auto[parent.id])) {
      return [];
    }
    return [
      {
        id: `${parent.id}>${node.id}`,
        type: 'mind' as const,
        source: parent.id,
        target: node.id,
        sourceHandle: sides[node.id] === 'left' ? 'left' : 'right',
        targetHandle: sides[node.id] === 'left' ? 'right' : 'left',
        selectable: false,
        deletable: false,
        focusable: false,
        data: { branch: branches.get(node.id)?.branch ?? '0' },
      },
    ];
  });
}

export function mergeEdges(diagram: Diagram, previous: TrazoEdge[], auto: PositionMap): TrazoEdge[] {
  return diagram.type === 'flowchart'
    ? flowchartEdges(diagram, previous, auto)
    : mindmapEdges(diagram, auto);
}
