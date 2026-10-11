import {
  addChild,
  addNode,
  addSibling,
  clearPositions,
  computeSides,
  connect,
  exampleFlowchart,
  exampleMindmap,
  moveMindNode,
  moveNode,
  reconnectEdge,
  removeBranch,
  removeEdge,
  removeNode,
  renameMindNode,
  updateEdgeLabel,
  updateNode,
  type Diagram,
  type EdgeEndpoints,
  type FlowchartDiagram,
  type MindmapDiagram,
  type NodeKind,
  type Position,
} from '@trazo/core';
import { create } from 'zustand';

export const DEFAULT_LABELS: Record<NodeKind, string> = {
  start: 'Inicio',
  process: 'Nuevo paso',
  decision: '¿Decisión?',
  end: 'Fin',
};

const DEFAULT_MIND_LABEL = 'Idea';

type DiagramType = Diagram['type'];

interface DiagramState {
  diagrams: { flowchart: FlowchartDiagram; mindmap: MindmapDiagram };
  active: DiagramType;
  autoPositions: Record<string, Position>;
  selectedNodeIds: string[];
  editingNodeId: string | null;
  setActive: (type: DiagramType) => void;
  setAutoPositions: (positions: Record<string, Position>) => void;
  rearrange: () => void;
  addFlowNode: (kind: NodeKind, position: Position) => void;
  moveNodeTo: (nodeId: string, position: Position) => void;
  renameNode: (nodeId: string, label: string) => void;
  removeNodes: (nodeIds: string[]) => void;
  connectNodes: (endpoints: EdgeEndpoints) => void;
  reconnectEdgeTo: (edgeId: string, endpoints: EdgeEndpoints) => void;
  setEdgeLabel: (edgeId: string, label: string) => void;
  removeEdges: (edgeIds: string[]) => void;
  addChildOf: (parentId: string) => void;
  addSiblingOf: (nodeId: string) => void;
  selectNode: (nodeId: string, selected: boolean) => void;
  startEditing: (nodeId: string) => void;
  stopEditing: () => void;
  loadExample: () => void;
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function selectActiveDiagram(state: DiagramState): Diagram {
  return state.diagrams[state.active];
}

function withFlowchart(
  state: DiagramState,
  change: (diagram: FlowchartDiagram) => FlowchartDiagram,
): Partial<DiagramState> {
  return { diagrams: { ...state.diagrams, flowchart: change(state.diagrams.flowchart) } };
}

function withMindmap(
  state: DiagramState,
  change: (diagram: MindmapDiagram) => MindmapDiagram,
): Partial<DiagramState> {
  return { diagrams: { ...state.diagrams, mindmap: change(state.diagrams.mindmap) } };
}

const CHILD_DISTANCE = 300;
const SIBLING_DISTANCE = 60;

// Posición inmediata para que el nodo nuevo se pinte y reciba foco sin esperar al layout asíncrono.
function withProvisional(
  state: DiagramState,
  diagram: MindmapDiagram,
  nodeId: string,
  anchorId: string,
  relation: 'child' | 'sibling',
): Record<string, Position> {
  const anchor = diagram.nodes.find((node) => node.id === anchorId);
  const base = anchor?.position ?? state.autoPositions[anchorId] ?? { x: 0, y: 0 };
  const direction = computeSides(diagram)[nodeId] === 'left' ? -1 : 1;
  const offset =
    relation === 'child'
      ? { x: CHILD_DISTANCE * direction, y: 0 }
      : { x: 0, y: SIBLING_DISTANCE };
  return { ...state.autoPositions, [nodeId]: { x: base.x + offset.x, y: base.y + offset.y } };
}

function hasNode(diagram: Diagram, nodeId: string): boolean {
  return diagram.nodes.some((node) => node.id === nodeId);
}

function survivingSelection(state: DiagramState, diagrams: DiagramState['diagrams']): string[] {
  const diagram = diagrams[state.active];
  return state.selectedNodeIds.filter((nodeId) => hasNode(diagram, nodeId));
}

export const useDiagramStore = create<DiagramState>((set) => ({
  diagrams: { flowchart: exampleFlowchart, mindmap: exampleMindmap },
  active: 'flowchart',
  autoPositions: {},
  selectedNodeIds: [],
  editingNodeId: null,

  setActive: (type) => set({ active: type, selectedNodeIds: [], editingNodeId: null }),

  setAutoPositions: (positions) => set({ autoPositions: positions }),

  rearrange: () =>
    set((state) =>
      state.active === 'flowchart'
        ? withFlowchart(state, clearPositions)
        : withMindmap(state, clearPositions),
    ),

  addFlowNode: (kind, position) => {
    const id = newId('n');
    set((state) => ({
      ...withFlowchart(state, (diagram) =>
        addNode(diagram, { id, kind, label: DEFAULT_LABELS[kind], position }),
      ),
      selectedNodeIds: [id],
      editingNodeId: id,
    }));
  },

  moveNodeTo: (nodeId, position) =>
    set((state) => {
      if (!hasNode(selectActiveDiagram(state), nodeId)) {
        return state;
      }
      return state.active === 'flowchart'
        ? withFlowchart(state, (diagram) => moveNode(diagram, nodeId, position))
        : withMindmap(state, (diagram) => moveMindNode(diagram, nodeId, position));
    }),

  renameNode: (nodeId, label) =>
    set((state) =>
      state.active === 'flowchart'
        ? withFlowchart(state, (diagram) => updateNode(diagram, nodeId, { label }))
        : withMindmap(state, (diagram) => renameMindNode(diagram, nodeId, label)),
    ),

  removeNodes: (nodeIds) =>
    set((state) => {
      const diagrams =
        state.active === 'flowchart'
          ? withFlowchart(state, (current) =>
              nodeIds
                .filter((nodeId) => hasNode(current, nodeId))
                .reduce(removeNode, current),
            ).diagrams
          : withMindmap(state, (current) =>
              nodeIds.reduce((acc, nodeId) => {
                const node = acc.nodes.find((candidate) => candidate.id === nodeId);
                return node && node.parent !== null ? removeBranch(acc, nodeId) : acc;
              }, current),
            ).diagrams;
      if (!diagrams) {
        return state;
      }
      return { diagrams, selectedNodeIds: survivingSelection(state, diagrams) };
    }),

  connectNodes: (endpoints) =>
    set((state) =>
      withFlowchart(state, (diagram) => connect(diagram, { id: newId('e'), ...endpoints })),
    ),

  reconnectEdgeTo: (edgeId, endpoints) =>
    set((state) => withFlowchart(state, (diagram) => reconnectEdge(diagram, edgeId, endpoints))),

  setEdgeLabel: (edgeId, label) =>
    set((state) =>
      withFlowchart(state, (diagram) => updateEdgeLabel(diagram, edgeId, label.trim())),
    ),

  removeEdges: (edgeIds) =>
    set((state) => withFlowchart(state, (diagram) => edgeIds.reduce(removeEdge, diagram))),

  addChildOf: (parentId) => {
    const id = newId('m');
    set((state) => {
      const mindmap = addChild(state.diagrams.mindmap, parentId, { id, label: DEFAULT_MIND_LABEL });
      return {
        diagrams: { ...state.diagrams, mindmap },
        autoPositions: withProvisional(state, mindmap, id, parentId, 'child'),
        selectedNodeIds: [id],
        editingNodeId: id,
      };
    });
  },

  addSiblingOf: (nodeId) => {
    const id = newId('m');
    set((state) => {
      const reference = state.diagrams.mindmap.nodes.find((node) => node.id === nodeId);
      if (!reference) {
        return state;
      }
      const isRoot = reference.parent === null;
      const created = { id, label: DEFAULT_MIND_LABEL };
      const mindmap = isRoot
        ? addChild(state.diagrams.mindmap, nodeId, created)
        : addSibling(state.diagrams.mindmap, nodeId, created);
      return {
        diagrams: { ...state.diagrams, mindmap },
        autoPositions: withProvisional(state, mindmap, id, nodeId, isRoot ? 'child' : 'sibling'),
        selectedNodeIds: [id],
        editingNodeId: id,
      };
    });
  },

  selectNode: (nodeId, selected) =>
    set((state) => {
      const without = state.selectedNodeIds.filter((candidate) => candidate !== nodeId);
      return { selectedNodeIds: selected ? [...without, nodeId] : without };
    }),

  startEditing: (nodeId) => set({ editingNodeId: nodeId }),
  stopEditing: () => set({ editingNodeId: null }),

  loadExample: () =>
    set((state) => ({
      diagrams: { ...state.diagrams, flowchart: exampleFlowchart },
      selectedNodeIds: [],
      editingNodeId: null,
    })),
}));
