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
import { OPPOSITE_SIDE, mindBranches, pickHandles } from '../shared/geometry';
import { FLOW_HEIGHT, FLOW_WIDTH, MIND_NODE, MIND_ROOT } from '../shared/nodeSizes';

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
        sourceHandle: sides[node.id] ?? 'right',
        targetHandle: OPPOSITE_SIDE[sides[node.id] ?? 'right'],
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
