import {
  addChild,
  addNode,
  addSibling,
  clearPositions,
  computeSides,
  connect,
  createFlowchart,
  createMindmap,
  exampleFlowchart,
  moveMindNode,
  moveNode,
  reconnectEdge,
  removeBranch,
  removeEdge,
  removeNode,
  renameMindNode,
  setTitle,
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
const UNTITLED = '';

export type SaveStatus = 'saved' | 'saving' | 'error';

export interface Notice {
  kind: 'error' | 'info';
  title: string;
  details: string[];
}

export interface OpenDocument {
  id: string;
  diagram: Diagram;
  token?: unknown;
}

interface DiagramState {
  documentId: string;
  diagram: Diagram;
  fileToken: unknown;
  saveStatus: SaveStatus;
  notice: Notice | null;
  autoPositions: Record<string, Position>;
  selectedNodeIds: string[];
  editingNodeId: string | null;
  loadDocument: (document: OpenDocument) => void;
  newDocument: (type: Diagram['type']) => void;
  renameDiagram: (title: string) => void;
  setFileToken: (token: unknown) => void;
  setSaveStatus: (status: SaveStatus) => void;
  showNotice: (notice: Notice) => void;
  dismissNotice: () => void;
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

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function selectActiveDiagram(state: DiagramState): Diagram {
  return state.diagram;
}

function withFlowchart(
  state: DiagramState,
  change: (diagram: FlowchartDiagram) => FlowchartDiagram,
): Partial<DiagramState> {
  return state.diagram.type === 'flowchart' ? { diagram: change(state.diagram) } : {};
}

function withMindmap(
  state: DiagramState,
  change: (diagram: MindmapDiagram) => MindmapDiagram,
): Partial<DiagramState> {
  return state.diagram.type === 'mindmap' ? { diagram: change(state.diagram) } : {};
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

export const useDiagramStore = create<DiagramState>((set) => ({
  documentId: newId('d'),
  diagram: exampleFlowchart,
  fileToken: undefined,
  saveStatus: 'saved',
  notice: null,
  autoPositions: {},
  selectedNodeIds: [],
  editingNodeId: null,

  loadDocument: ({ id, diagram, token }) =>
    set({
      documentId: id,
      diagram,
      fileToken: token,
      saveStatus: 'saved',
      autoPositions: {},
      selectedNodeIds: [],
      editingNodeId: null,
    }),

  newDocument: (type) =>
    set({
      documentId: newId('d'),
      diagram:
        type === 'flowchart'
          ? createFlowchart(UNTITLED)
          : createMindmap(UNTITLED, newId('m'), 'Idea central'),
      fileToken: undefined,
      saveStatus: 'saved',
      autoPositions: {},
      selectedNodeIds: [],
      editingNodeId: null,
    }),

  renameDiagram: (title) => set((state) => ({ diagram: setTitle(state.diagram, title) })),
  setFileToken: (token) => set({ fileToken: token }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  showNotice: (notice) => set({ notice }),
  dismissNotice: () => set({ notice: null }),

  setAutoPositions: (positions) => set({ autoPositions: positions }),

  rearrange: () => set((state) => ({ diagram: clearPositions(state.diagram) })),

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
      if (!hasNode(state.diagram, nodeId)) {
        return state;
      }
      return state.diagram.type === 'flowchart'
        ? withFlowchart(state, (diagram) => moveNode(diagram, nodeId, position))
        : withMindmap(state, (diagram) => moveMindNode(diagram, nodeId, position));
    }),

  renameNode: (nodeId, label) =>
    set((state) =>
      state.diagram.type === 'flowchart'
        ? withFlowchart(state, (diagram) => updateNode(diagram, nodeId, { label }))
        : withMindmap(state, (diagram) => renameMindNode(diagram, nodeId, label)),
    ),

  removeNodes: (nodeIds) =>
    set((state) => {
      const changed =
        state.diagram.type === 'flowchart'
          ? withFlowchart(state, (current) =>
              nodeIds.filter((nodeId) => hasNode(current, nodeId)).reduce(removeNode, current),
            )
          : withMindmap(state, (current) =>
              nodeIds.reduce((acc, nodeId) => {
                const node = acc.nodes.find((candidate) => candidate.id === nodeId);
                return node && node.parent !== null ? removeBranch(acc, nodeId) : acc;
              }, current),
            );
      const diagram = changed.diagram ?? state.diagram;
      return {
        ...changed,
        selectedNodeIds: state.selectedNodeIds.filter((nodeId) => hasNode(diagram, nodeId)),
      };
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
      if (state.diagram.type !== 'mindmap') {
        return state;
      }
      const mindmap = addChild(state.diagram, parentId, { id, label: DEFAULT_MIND_LABEL });
      return {
        diagram: mindmap,
        autoPositions: withProvisional(state, mindmap, id, parentId, 'child'),
        selectedNodeIds: [id],
        editingNodeId: id,
      };
    });
  },

  addSiblingOf: (nodeId) => {
    const id = newId('m');
    set((state) => {
      if (state.diagram.type !== 'mindmap') {
        return state;
      }
      const reference = state.diagram.nodes.find((node) => node.id === nodeId);
      if (!reference) {
        return state;
      }
      const isRoot = reference.parent === null;
      const created = { id, label: DEFAULT_MIND_LABEL };
      const mindmap = isRoot
        ? addChild(state.diagram, nodeId, created)
        : addSibling(state.diagram, nodeId, created);
      return {
        diagram: mindmap,
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
    set({ diagram: exampleFlowchart, selectedNodeIds: [], editingNodeId: null, autoPositions: {} }),
}));
