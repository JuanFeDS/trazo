import type { FlowchartDiagram, DiagramEdge, FlowNode, Position } from './diagram';

export class DomainError extends Error {}

function requireNode(diagram: FlowchartDiagram, nodeId: string): FlowNode {
  const node = diagram.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    throw new DomainError(`No existe el nodo "${nodeId}"`);
  }
  return node;
}

export function addNode(diagram: FlowchartDiagram, node: FlowNode): FlowchartDiagram {
  if (diagram.nodes.some((candidate) => candidate.id === node.id)) {
    throw new DomainError(`Ya existe el nodo "${node.id}"`);
  }
  return { ...diagram, nodes: [...diagram.nodes, node] };
}

export function updateNode(
  diagram: FlowchartDiagram,
  nodeId: string,
  changes: Partial<Pick<FlowNode, 'label' | 'kind'>>,
): FlowchartDiagram {
  requireNode(diagram, nodeId);
  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => (node.id === nodeId ? { ...node, ...changes } : node)),
  };
}

export function moveNode(diagram: FlowchartDiagram, nodeId: string, position: Position): FlowchartDiagram {
  requireNode(diagram, nodeId);
  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => (node.id === nodeId ? { ...node, position } : node)),
  };
}

export function removeNode(diagram: FlowchartDiagram, nodeId: string): FlowchartDiagram {
  requireNode(diagram, nodeId);
  return {
    ...diagram,
    nodes: diagram.nodes.filter((node) => node.id !== nodeId),
    edges: diagram.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId),
  };
}

export function connect(diagram: FlowchartDiagram, edge: DiagramEdge): FlowchartDiagram {
  requireNode(diagram, edge.from);
  requireNode(diagram, edge.to);
  const isDuplicate = diagram.edges.some(
    (candidate) =>
      candidate.id === edge.id || (candidate.from === edge.from && candidate.to === edge.to),
  );
  if (isDuplicate) {
    return diagram;
  }
  return { ...diagram, edges: [...diagram.edges, edge] };
}

export type EdgeEndpoints = Pick<DiagramEdge, 'from' | 'to' | 'fromSide' | 'toSide'>;

export function reconnectEdge(diagram: FlowchartDiagram, edgeId: string, endpoints: EdgeEndpoints): FlowchartDiagram {
  requireNode(diagram, endpoints.from);
  requireNode(diagram, endpoints.to);
  if (!diagram.edges.some((edge) => edge.id === edgeId)) {
    throw new DomainError(`No existe la conexión "${edgeId}"`);
  }
  return {
    ...diagram,
    edges: diagram.edges.map((edge) => {
      if (edge.id !== edgeId) {
        return edge;
      }
      const { fromSide: _fromSide, toSide: _toSide, ...rest } = edge;
      return {
        ...rest,
        from: endpoints.from,
        to: endpoints.to,
        ...(endpoints.fromSide && { fromSide: endpoints.fromSide }),
        ...(endpoints.toSide && { toSide: endpoints.toSide }),
      };
    }),
  };
}

export function updateEdgeLabel(diagram: FlowchartDiagram, edgeId: string, label: string): FlowchartDiagram {
  if (!diagram.edges.some((edge) => edge.id === edgeId)) {
    throw new DomainError(`No existe la conexión "${edgeId}"`);
  }
  return {
    ...diagram,
    edges: diagram.edges.map((edge) => {
      if (edge.id !== edgeId) {
        return edge;
      }
      const { label: _previous, ...rest } = edge;
      return label ? { ...rest, label } : rest;
    }),
  };
}

export function removeEdge(diagram: FlowchartDiagram, edgeId: string): FlowchartDiagram {
  return { ...diagram, edges: diagram.edges.filter((edge) => edge.id !== edgeId) };
}
