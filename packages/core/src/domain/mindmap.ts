import type { MindmapDiagram, MindNode, MindSide, Position } from './diagram';
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

function topLevelNodes(diagram: MindmapDiagram): MindNode[] {
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  return diagram.nodes.filter((node) => node.parent !== null && byId.get(node.parent)?.parent === null);
}

// Las ramas de primer nivel se alternan derecha/izquierda salvo que traigan `side`; cada rama
// arrastra a sus descendientes.
export function computeSides(diagram: MindmapDiagram): Record<string, MindSide> {
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const sides: Record<string, MindSide> = {};
  topLevelNodes(diagram).forEach((node, index) => {
    sides[node.id] = node.side ?? (index % 2 === 0 ? 'right' : 'left');
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

function branchIds(diagram: MindmapDiagram, nodeId: string): Set<string> {
  const ids = new Set([nodeId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const node of diagram.nodes) {
      if (node.parent !== null && ids.has(node.parent) && !ids.has(node.id)) {
        ids.add(node.id);
        grew = true;
      }
    }
  }
  return ids;
}

export function removeBranch(diagram: MindmapDiagram, nodeId: string): MindmapDiagram {
  const target = requireNode(diagram, nodeId);
  if (target.parent === null) {
    throw new DomainError('No se puede borrar la raíz');
  }
  const doomed = branchIds(diagram, nodeId);
  return { ...diagram, nodes: diagram.nodes.filter((node) => !doomed.has(node.id)) };
}

// Fija el lado de todas las ramas de primer nivel (para que cambiar una no desplace a las demás)
// y descarta las posiciones manuales de la rama movida, que quedarían en el lado equivocado.
export function setBranchSide(diagram: MindmapDiagram, nodeId: string, side: MindSide): MindmapDiagram {
  const target = requireNode(diagram, nodeId);
  const topLevel = new Set(topLevelNodes(diagram).map((node) => node.id));
  if (!topLevel.has(target.id)) {
    throw new DomainError('Solo se puede elegir el lado de una rama de primer nivel');
  }
  const current = computeSides(diagram);
  const moved = branchIds(diagram, nodeId);
  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => {
      const { position, ...rest } = node;
      const isMoved = moved.has(node.id);
      const withSide = topLevel.has(node.id)
        ? { ...rest, side: node.id === nodeId ? side : (current[node.id] ?? 'right') }
        : rest;
      return isMoved || position === undefined ? withSide : { ...withSide, position };
    }),
  };
}
