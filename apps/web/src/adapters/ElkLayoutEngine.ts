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
  return {
    id: 'root',
    layoutOptions: {
      ...SHARED_OPTIONS,
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '70',
    },
    children: diagram.nodes.map((node) => ({
      id: node.id,
      width: FLOW_WIDTH,
      height: FLOW_HEIGHT[node.kind],
    })),
    edges: diagram.edges.map((edge) => ({ id: edge.id, sources: [edge.from], targets: [edge.to] })),
  };
}

// Un lado del mapa: la raíz más las ramas que caen en ese lado.
function mindmapSideGraph(
  diagram: MindmapDiagram,
  sides: Record<string, MindSide>,
  side: MindSide,
): ElkNode {
  const members = diagram.nodes.filter((node) => node.parent === null || sides[node.id] === side);
  return {
    id: 'root',
    layoutOptions: {
      ...SHARED_OPTIONS,
      'elk.direction': side === 'right' ? 'RIGHT' : 'LEFT',
      'elk.spacing.nodeNode': '24',
      'elk.layered.spacing.nodeNodeBetweenLayers': '90',
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

  private async layoutMindmap(diagram: MindmapDiagram): Promise<Record<string, Position>> {
    const sides = computeSides(diagram);
    const rightResult = await this.elk.layout(mindmapSideGraph(diagram, sides, 'right'));
    const leftResult = await this.elk.layout(mindmapSideGraph(diagram, sides, 'left'));
    const rootId = diagram.nodes.find((node) => node.parent === null)?.id ?? '';

    const rightRoot = rightResult.children?.find((child) => child.id === rootId);
    const leftRoot = leftResult.children?.find((child) => child.id === rootId);
    const leftShift = {
      x: (rightRoot?.x ?? 0) - (leftRoot?.x ?? 0),
      y: (rightRoot?.y ?? 0) - (leftRoot?.y ?? 0),
    };

    const positions = this.toPositions(rightResult, { x: 0, y: 0 });
    const leftPositions = this.toPositions(leftResult, leftShift);
    for (const node of diagram.nodes) {
      if (node.parent !== null && sides[node.id] === 'left' && leftPositions[node.id]) {
        positions[node.id] = leftPositions[node.id] as Position;
      }
    }
    return positions;
  }

  private toPositions(result: ElkNode, shift: Position): Record<string, Position> {
    const positions: Record<string, Position> = {};
    for (const child of result.children ?? []) {
      positions[child.id] = { x: snap((child.x ?? 0) + shift.x), y: snap((child.y ?? 0) + shift.y) };
    }
    return positions;
  }
}
