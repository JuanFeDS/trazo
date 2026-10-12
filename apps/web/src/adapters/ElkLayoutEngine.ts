import {
  computeSides,
  type FlowchartDiagram,
  type LayoutEngine,
  type MindmapDiagram,
  type MindSide,
  type Position,
} from '@trazo/core';
import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js';
import { FLOW_HEIGHT, FLOW_WIDTH, MIND_NODE, MIND_ROOT } from '../shared/nodeSizes';

const GRID = 20;

const SHARED_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
};

function flowchartGraph(diagram: FlowchartDiagram): ElkNode {
  const primary = primaryEdgeIds(diagram);
  return {
    id: 'root',
    layoutOptions: {
      ...SHARED_OPTIONS,
      'elk.direction': 'DOWN',
      // Brandes-Köpf respeta la prioridad de rectitud de las conexiones principales.
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.nodePlacement.favorStraightEdges': 'true',
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '70',
    },
    children: diagram.nodes.map((node) => ({
      id: node.id,
      width: FLOW_WIDTH,
      height: FLOW_HEIGHT[node.kind],
    })),
    edges: diagram.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.from],
      targets: [edge.to],
      layoutOptions: {
        'elk.layered.priority.straightness': primary.has(edge.id) ? '10' : '1',
      },
    })),
  };
}

// La primera conexión de salida de cada nodo es la "principal": elkjs intenta dejarla recta.
function primaryEdgeIds(diagram: FlowchartDiagram): Set<string> {
  const seenSources = new Set<string>();
  const primary = new Set<string>();
  for (const edge of diagram.edges) {
    if (!seenSources.has(edge.from)) {
      seenSources.add(edge.from);
      primary.add(edge.id);
    }
  }
  return primary;
}

const ELK_DIRECTION: Record<MindSide, string> = {
  right: 'RIGHT',
  left: 'LEFT',
  bottom: 'DOWN',
  top: 'UP',
};
const SIDE_ORDER: readonly MindSide[] = ['right', 'left', 'bottom', 'top'];
const CLEARANCE = 32;

// Un lado del mapa: la raíz más las ramas que caen en ese lado.
function mindmapSideGraph(
  diagram: MindmapDiagram,
  sides: Record<string, MindSide>,
  side: MindSide,
): ElkNode {
  const members = diagram.nodes.filter((node) => node.parent === null || sides[node.id] === side);
  const isVertical = side === 'top' || side === 'bottom';
  return {
    id: 'root',
    layoutOptions: {
      ...SHARED_OPTIONS,
      'elk.direction': ELK_DIRECTION[side],
      'elk.spacing.nodeNode': '24',
      'elk.layered.spacing.nodeNodeBetweenLayers': isVertical ? '70' : '90',
    },
    children: members.map((node) => ({
      id: node.id,
      ...(node.parent === null ? MIND_ROOT : MIND_NODE),
    })),
    edges: members.flatMap((node) =>
      node.parent === null
        ? []
        : [{ id: `${node.parent}>${node.id}`, sources: [node.parent], targets: [node.id] }],
    ),
  };
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function boundsOf(ids: readonly string[], positions: Record<string, Position>): Bounds | undefined {
  const boxes = ids.flatMap((id) => {
    const position = positions[id];
    return position ? [position] : [];
  });
  if (boxes.length === 0) {
    return undefined;
  }
  return {
    minX: Math.min(...boxes.map((box) => box.x)),
    minY: Math.min(...boxes.map((box) => box.y)),
    maxX: Math.max(...boxes.map((box) => box.x + MIND_NODE.width)),
    maxY: Math.max(...boxes.map((box) => box.y + MIND_NODE.height)),
  };
}

function overlaps(first: Bounds, second: Bounds): boolean {
  return (
    first.minX < second.maxX + CLEARANCE &&
    second.minX < first.maxX + CLEARANCE &&
    first.minY < second.maxY + CLEARANCE &&
    second.minY < first.maxY + CLEARANCE
  );
}

function snap(value: number): number {
  return Math.round(value / GRID) * GRID;
}

export class ElkLayoutEngine implements LayoutEngine {
  private readonly elk = new ELK();

  async layout(diagram: FlowchartDiagram | MindmapDiagram): Promise<Record<string, Position>> {
    if (diagram.type === 'flowchart') {
      return this.toPositions(await this.elk.layout(flowchartGraph(diagram)), { x: 0, y: 0 });
    }
    return this.layoutMindmap(diagram);
  }

  // Una pasada de elkjs por cada lado que tenga ramas, con la raíz alineada en todas.
  private async layoutMindmap(diagram: MindmapDiagram): Promise<Record<string, Position>> {
    const sides = computeSides(diagram);
    const root = diagram.nodes.find((node) => node.parent === null);
    if (!root) {
      return {};
    }
    const idsBySide = (side: MindSide) =>
      diagram.nodes.filter((node) => node.parent !== null && sides[node.id] === side).map((node) => node.id);
    const usedSides = SIDE_ORDER.filter((side) => idsBySide(side).length > 0);

    const positions: Record<string, Position> = { [root.id]: { x: 0, y: 0 } };
    let anchor: Position | undefined;
    for (const side of usedSides) {
      const result = await this.elk.layout(mindmapSideGraph(diagram, sides, side));
      const sideRoot = result.children?.find((child) => child.id === root.id);
      anchor ??= { x: sideRoot?.x ?? 0, y: sideRoot?.y ?? 0 };
      const shift = { x: anchor.x - (sideRoot?.x ?? 0), y: anchor.y - (sideRoot?.y ?? 0) };
      const placed = this.toPositions(result, shift);
      for (const id of idsBySide(side)) {
        const position = placed[id];
        if (position) {
          positions[id] = position;
        }
      }
      positions[root.id] = placed[root.id] ?? positions[root.id] ?? { x: 0, y: 0 };
    }

    this.pushVerticalBranchesClear(idsBySide, positions);
    return positions;
  }

  // Una rama hacia arriba o abajo puede quedar bajo las ramas laterales; se aleja lo justo.
  private pushVerticalBranchesClear(
    idsBySide: (side: MindSide) => string[],
    positions: Record<string, Position>,
  ): void {
    const horizontal = boundsOf([...idsBySide('left'), ...idsBySide('right')], positions);
    if (!horizontal) {
      return;
    }
    for (const side of ['bottom', 'top'] as const) {
      const ids = idsBySide(side);
      const bounds = boundsOf(ids, positions);
      if (!bounds || !overlaps(bounds, horizontal)) {
        continue;
      }
      const shift =
        side === 'bottom'
          ? horizontal.maxY + CLEARANCE - bounds.minY
          : horizontal.minY - CLEARANCE - bounds.maxY;
      for (const id of ids) {
        const position = positions[id];
        if (position) {
          positions[id] = { x: position.x, y: snap(position.y + shift) };
        }
      }
    }
  }

  private toPositions(result: ElkNode, shift: Position): Record<string, Position> {
    const positions: Record<string, Position> = {};
    for (const child of result.children ?? []) {
      positions[child.id] = { x: snap((child.x ?? 0) + shift.x), y: snap((child.y ?? 0) + shift.y) };
    }
    return positions;
  }
}
