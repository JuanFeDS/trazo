export type NodeKind = 'start' | 'process' | 'decision' | 'end';

export interface Position {
  x: number;
  y: number;
}

export interface DiagramNode {
  id: string;
  label: string;
  kind: NodeKind;
  position?: Position;
}

export type Side = 'top' | 'right' | 'bottom' | 'left';

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  fromSide?: Side;
  toSide?: Side;
  label?: string;
}

export interface Diagram {
  version: 1;
  type: 'flowchart';
  title: string;
  nodes: readonly DiagramNode[];
  edges: readonly DiagramEdge[];
}

export function createDiagram(title: string): Diagram {
  return { version: 1, type: 'flowchart', title, nodes: [], edges: [] };
}
