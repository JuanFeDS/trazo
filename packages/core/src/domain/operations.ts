import type { Diagram, DiagramEdge, DiagramNode, Position } from './diagram';

export class DomainError extends Error {}

function requireNode(diagram: Diagram, nodeId: string): DiagramNode {
  const node = diagram.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    throw new DomainError(`No existe el nodo "${nodeId}"`);
  }
  return node;
}

export function addNode(diagram: Diagram, node: DiagramNode): Diagram {
  if (diagram.nodes.some((candidate) => candidate.id === node.id)) {
    throw new DomainError(`Ya existe el nodo "${node.id}"`);
  }
  return { ...diagram, nodes: [...diagram.nodes, node] };
}

export function updateNode(
  diagram: Diagram,
  nodeId: string,
  changes: Partial<Pick<DiagramNode, 'label' | 'kind'>>,
): Diagram {
  requireNode(diagram, nodeId);
  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => (node.id === nodeId ? { ...node, ...changes } : node)),
  };
}

export function moveNode(diagram: Diagram, nodeId: string, position: Position): Diagram {
  requireNode(diagram, nodeId);
  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => (node.id === nodeId ? { ...node, position } : node)),
  };
}

export function removeNode(diagram: Diagram, nodeId: string): Diagram {
  requireNode(diagram, nodeId);
  return {
    ...diagram,
    nodes: diagram.nodes.filter((node) => node.id !== nodeId),
    edges: diagram.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId),
  };
}

export function connect(diagram: Diagram, edge: DiagramEdge): Diagram {
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

export function reconnectEdge(diagram: Diagram, edgeId: string, endpoints: EdgeEndpoints): Diagram {
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

export function updateEdgeLabel(diagram: Diagram, edgeId: string, label: string): Diagram {
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

export function removeEdge(diagram: Diagram, edgeId: string): Diagram {
  return { ...diagram, edges: diagram.edges.filter((edge) => edge.id !== edgeId) };
}
