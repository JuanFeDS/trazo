import {
  addChild,
  addNode,
  addSibling,
  clearPositions,
  computeSides,
  connect,
  createFlowchart,
  createHistory,
  createMindmap,
  pushHistory,
  redo as redoHistory,
  undo as undoHistory,
  exampleFlowchart,
  moveMindNode,
  moveNode,
  reconnectEdge,
  removeBranch,
  removeEdge,
  removeNode,
  renameMindNode,
  setBranchSide,
  setTitle,
  updateEdgeLabel,
  updateNode,
  type Diagram,
  type EdgeEndpoints,
  type FlowchartDiagram,
  type History,
  type MindmapDiagram,
  type MindSide,
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

type ChangeKind = 'edit' | 'move' | 'title';

interface DiagramState {
  documentId: string;
  diagram: Diagram;
  history: History<Diagram>;
  lastChange: { kind: ChangeKind | null; at: number };
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
  setBranchSideOf: (nodeId: string, side: MindSide) => void;
  selectNode: (nodeId: string, selected: boolean) => void;
  startEditing: (nodeId: string) => void;
  stopEditing: () => void;
  loadExample: () => void;
  undo: () => void;
  redo: () => void;
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function selectActiveDiagram(state: DiagramState): Diagram {
  return state.diagram;
}

const COALESCE_MS = 800;

// Los arrastres y las pulsaciones del título llegan en ráfagas: se funden en un solo paso de deshacer.
function commit(
  state: DiagramState,
  diagram: Diagram,
  kind: ChangeKind = 'edit',
): Partial<DiagramState> {
  if (diagram === state.diagram) {
    return {};
  }
  const now = Date.now();
  const coalesce =
    kind !== 'edit' && state.lastChange.kind === kind && now - state.lastChange.at < COALESCE_MS;
  return {
    diagram,
    history: pushHistory(state.history, diagram, coalesce),
    lastChange: { kind, at: now },
  };
}

function freshHistory(diagram: Diagram): Partial<DiagramState> {
  return { history: createHistory(diagram), lastChange: { kind: null, at: 0 } };
}

function withFlowchart(
  state: DiagramState,
  change: (diagram: FlowchartDiagram) => FlowchartDiagram,
  kind?: ChangeKind,
): Partial<DiagramState> {
  return state.diagram.type === 'flowchart' ? commit(state, change(state.diagram), kind) : {};
}

function withMindmap(
  state: DiagramState,
  change: (diagram: MindmapDiagram) => MindmapDiagram,
  kind?: ChangeKind,
): Partial<DiagramState> {
  return state.diagram.type === 'mindmap' ? commit(state, change(state.diagram), kind) : {};
}

const CHILD_DISTANCE = { horizontal: 300, vertical: 120 };
const SIBLING_DISTANCE = { horizontal: 60, vertical: 240 };

// Un hijo se aleja del padre en la dirección de su rama; un hermano se corre a lo largo de ella.
function provisionalOffset(side: MindSide, relation: 'child' | 'sibling'): Position {
  const isVertical = side === 'top' || side === 'bottom';
  if (relation === 'sibling') {
    return isVertical
      ? { x: SIBLING_DISTANCE.vertical, y: 0 }
      : { x: 0, y: SIBLING_DISTANCE.horizontal };
  }
  switch (side) {
    case 'left':
      return { x: -CHILD_DISTANCE.horizontal, y: 0 };
    case 'top':
      return { x: 0, y: -CHILD_DISTANCE.vertical };
    case 'bottom':
      return { x: 0, y: CHILD_DISTANCE.vertical };
    default:
      return { x: CHILD_DISTANCE.horizontal, y: 0 };
  }
}

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
  const side = computeSides(diagram)[nodeId] ?? 'right';
  const offset = provisionalOffset(side, relation);
  return { ...state.autoPositions, [nodeId]: { x: base.x + offset.x, y: base.y + offset.y } };
}

function hasNode(diagram: Diagram, nodeId: string): boolean {
  return diagram.nodes.some((node) => node.id === nodeId);
}

export const useDiagramStore = create<DiagramState>((set) => ({
  documentId: newId('d'),
  diagram: exampleFlowchart,
  history: createHistory<Diagram>(exampleFlowchart),
  lastChange: { kind: null, at: 0 },
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
      ...freshHistory(diagram),
      fileToken: token,
      saveStatus: 'saved',
      autoPositions: {},
      selectedNodeIds: [],
      editingNodeId: null,
    }),

  newDocument: (type) => {
    const diagram =
      type === 'flowchart'
        ? createFlowchart(UNTITLED)
        : createMindmap(UNTITLED, newId('m'), 'Idea central');
    set({
      documentId: newId('d'),
      diagram,
      ...freshHistory(diagram),
      fileToken: undefined,
      saveStatus: 'saved',
      autoPositions: {},
      selectedNodeIds: [],
      editingNodeId: null,
    });
  },

  renameDiagram: (title) =>
    set((state) => commit(state, setTitle(state.diagram, title), 'title')),
  setFileToken: (token) => set({ fileToken: token }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  showNotice: (notice) => set({ notice }),
  dismissNotice: () => set({ notice: null }),

  setAutoPositions: (positions) => set({ autoPositions: positions }),

  rearrange: () => set((state) => commit(state, clearPositions(state.diagram))),

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
        ? withFlowchart(state, (diagram) => moveNode(diagram, nodeId, position), 'move')
        : withMindmap(state, (diagram) => moveMindNode(diagram, nodeId, position), 'move');
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
        ...commit(state, mindmap),
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
        ...commit(state, mindmap),
        autoPositions: withProvisional(state, mindmap, id, nodeId, isRoot ? 'child' : 'sibling'),
        selectedNodeIds: [id],
        editingNodeId: id,
      };
    });
  },

  setBranchSideOf: (nodeId, side) =>
    set((state) => withMindmap(state, (diagram) => setBranchSide(diagram, nodeId, side))),

  selectNode: (nodeId, selected) =>
    set((state) => {
      const without = state.selectedNodeIds.filter((candidate) => candidate !== nodeId);
      return { selectedNodeIds: selected ? [...without, nodeId] : without };
    }),

  startEditing: (nodeId) => set({ editingNodeId: nodeId }),
  stopEditing: () => set({ editingNodeId: null }),

  loadExample: () =>
    set((state) => ({
      ...commit(state, exampleFlowchart),
      selectedNodeIds: [],
      editingNodeId: null,
      autoPositions: {},
    })),

  undo: () =>
    set((state) => {
      const history = undoHistory(state.history);
      return history === state.history ? state : restore(state, history);
    }),

  redo: () =>
    set((state) => {
      const history = redoHistory(state.history);
      return history === state.history ? state : restore(state, history);
    }),
}));

function restore(state: DiagramState, history: History<Diagram>): Partial<DiagramState> {
  return {
    history,
    diagram: history.present,
    lastChange: { kind: null, at: 0 },
    editingNodeId: null,
    selectedNodeIds: state.selectedNodeIds.filter((nodeId) => hasNode(history.present, nodeId)),
  };
}
