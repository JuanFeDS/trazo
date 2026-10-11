import type { MindmapDiagram, MindNode, Position } from './diagram';
import { DomainError } from './operations';

function requireNode(diagram: MindmapDiagram, nodeId: string): MindNode {
  const node = diagram.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    throw new DomainError(`No existe el nodo "${nodeId}"`);
  }
  return node;
}

function requireFreeId(diagram: MindmapDiagram, nodeId: string): void {
  if (diagram.nodes.some((candidate) => candidate.id === nodeId)) {
    throw new DomainError(`Ya existe el nodo "${nodeId}"`);
  }
}

export function addChild(
  diagram: MindmapDiagram,
  parentId: string,
  child: { id: string; label: string },
): MindmapDiagram {
  requireNode(diagram, parentId);
  requireFreeId(diagram, child.id);
  return { ...diagram, nodes: [...diagram.nodes, { ...child, parent: parentId }] };
}

export function addSibling(
  diagram: MindmapDiagram,
  nodeId: string,
  sibling: { id: string; label: string },
): MindmapDiagram {
  const reference = requireNode(diagram, nodeId);
  if (reference.parent === null) {
    throw new DomainError('La raíz no tiene hermanos');
  }
  requireFreeId(diagram, sibling.id);
  const index = diagram.nodes.findIndex((node) => node.id === nodeId);
  const nodes = [...diagram.nodes];
  nodes.splice(index + 1, 0, { ...sibling, parent: reference.parent });
  return { ...diagram, nodes };
}

export function renameMindNode(diagram: MindmapDiagram, nodeId: string, label: string): MindmapDiagram {
  requireNode(diagram, nodeId);
  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => (node.id === nodeId ? { ...node, label } : node)),
  };
}

export function moveMindNode(diagram: MindmapDiagram, nodeId: string, position: Position): MindmapDiagram {
  requireNode(diagram, nodeId);
  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => (node.id === nodeId ? { ...node, position } : node)),
  };
}

export type MindSide = 'left' | 'right';

// Las ramas de primer nivel se alternan derecha/izquierda; cada rama arrastra a sus descendientes.
export function computeSides(diagram: MindmapDiagram): Record<string, MindSide> {
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const topLevel = diagram.nodes.filter(
    (node) => node.parent !== null && byId.get(node.parent)?.parent === null,
  );
  const sides: Record<string, MindSide> = {};
  topLevel.forEach((node, index) => {
    sides[node.id] = index % 2 === 0 ? 'right' : 'left';
  });

  const resolve = (node: MindNode): MindSide | undefined => {
    const known = sides[node.id];
    if (known || node.parent === null) {
      return known;
    }
    const parent = byId.get(node.parent);
    const inherited = parent && resolve(parent);
    if (inherited) {
      sides[node.id] = inherited;
    }
    return inherited;
  };
  diagram.nodes.forEach(resolve);
  return sides;
}

export function removeBranch(diagram: MindmapDiagram, nodeId: string): MindmapDiagram {
  const target = requireNode(diagram, nodeId);
  if (target.parent === null) {
    throw new DomainError('No se puede borrar la raíz');
  }
  const doomed = new Set([nodeId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const node of diagram.nodes) {
      if (node.parent !== null && doomed.has(node.parent) && !doomed.has(node.id)) {
        doomed.add(node.id);
        grew = true;
      }
    }
  }
  return { ...diagram, nodes: diagram.nodes.filter((node) => !doomed.has(node.id)) };
}
