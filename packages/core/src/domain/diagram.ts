export type NodeKind = 'start' | 'process' | 'decision' | 'end';

export interface Position {
  x: number;
  y: number;
}

export interface FlowNode {
  id: string;
  label: string;
  kind: NodeKind;
  position?: Position;
}

export interface MindNode {
  id: string;
  label: string;
  parent: string | null;
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

export interface FlowchartDiagram {
  version: 1;
  type: 'flowchart';
  title: string;
  nodes: readonly FlowNode[];
  edges: readonly DiagramEdge[];
}

export interface MindmapDiagram {
  version: 1;
  type: 'mindmap';
  title: string;
  nodes: readonly MindNode[];
}

export type Diagram = FlowchartDiagram | MindmapDiagram;

export function createFlowchart(title: string): FlowchartDiagram {
  return { version: 1, type: 'flowchart', title, nodes: [], edges: [] };
}

export function createMindmap(title: string, rootId: string, rootLabel: string): MindmapDiagram {
  return {
    version: 1,
    type: 'mindmap',
    title,
    nodes: [{ id: rootId, label: rootLabel, parent: null }],
  };
}

export function clearPositions<T extends Diagram>(diagram: T): T {
  const nodes = diagram.nodes.map(({ position: _position, ...rest }) => rest);
  return { ...diagram, nodes } as T;
}
