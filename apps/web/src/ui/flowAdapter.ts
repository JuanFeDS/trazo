import type { Diagram, EdgeEndpoints, Position, Side } from '@trazo/core';
import { MarkerType, type Connection, type Edge, type Node } from '@xyflow/react';

export interface TrazoNodeData extends Record<string, unknown> {
  label: string;
  kind: string;
}

export interface TrazoEdgeData extends Record<string, unknown> {
  label?: string;
}

export type TrazoNode = Node<TrazoNodeData, 'trazo'>;
export type TrazoEdge = Edge<TrazoEdgeData, 'trazo'>;

const FALLBACK_ROW_HEIGHT = 120;

export function mergeNodes(diagram: Diagram, previous: TrazoNode[]): TrazoNode[] {
  return diagram.nodes.map((node, index) => {
    const existing = previous.find((candidate) => candidate.id === node.id);
    return {
      ...existing,
      id: node.id,
      type: 'trazo',
      position: node.position ?? existing?.position ?? { x: 0, y: index * FALLBACK_ROW_HEIGHT },
      data: { label: node.label, kind: node.kind },
    };
  });
}

const VERTICAL_BIAS = 0.6;
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
  if (fromKind === 'decision' && deltaX !== 0) {
    return { sourceHandle: deltaX > 0 ? 'right' : 'left', targetHandle: 'top' };
  }
  if (Math.abs(deltaY) >= Math.abs(deltaX) * VERTICAL_BIAS) {
    return { sourceHandle: 'bottom', targetHandle: 'top' };
  }
  return deltaX >= 0
    ? { sourceHandle: 'right', targetHandle: 'left' }
    : { sourceHandle: 'left', targetHandle: 'right' };
}

export function mergeEdges(diagram: Diagram, previous: TrazoEdge[]): TrazoEdge[] {
  return diagram.edges.map((edge) => {
    const existing = previous.find((candidate) => candidate.id === edge.id);
    const fromNode = diagram.nodes.find((node) => node.id === edge.from);
    const from = fromNode?.position;
    const to = diagram.nodes.find((node) => node.id === edge.to)?.position;
    return {
      ...existing,
      id: edge.id,
      type: 'trazo',
      source: edge.from,
      target: edge.to,
      ...pickHandles(from, to, fromNode?.kind),
      ...(edge.fromSide && { sourceHandle: edge.fromSide }),
      ...(edge.toSide && { targetHandle: edge.toSide }),
      data: edge.label ? { label: edge.label } : {},
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--edge-color)', width: 18, height: 18 },
    };
  });
}
