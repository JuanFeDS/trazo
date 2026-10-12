import type { MindmapDiagram, Position, Side } from '@trazo/core';
import { FLOW_WIDTH } from './nodeSizes';

const BRANCH_COLORS = 4;
const VERTICAL_BIAS = 0.6;
// Una decisión solo sale por el costado si el destino queda desplazado al menos media anchura.
const DECISION_SIDE_EXIT = FLOW_WIDTH / 2;

export function pickHandles(
  from?: Position,
  to?: Position,
  fromKind?: string,
): { sourceHandle: Side; targetHandle: Side } {
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

export function handlePoint(position: Position, size: { width: number; height: number }, side: Side): Position {
  switch (side) {
    case 'top':
      return { x: position.x + size.width / 2, y: position.y };
    case 'bottom':
      return { x: position.x + size.width / 2, y: position.y + size.height };
    case 'left':
      return { x: position.x, y: position.y + size.height / 2 };
    case 'right':
      return { x: position.x + size.width, y: position.y + size.height / 2 };
  }
}

export function mindBranches(diagram: MindmapDiagram): Map<string, { branch: string; depth: number }> {
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const rootChildren = diagram.nodes.filter(
    (node) => node.parent !== null && byId.get(node.parent)?.parent === null,
  );
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
