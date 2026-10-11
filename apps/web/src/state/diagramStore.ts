import {
  addNode,
  connect,
  exampleDiagram,
  moveNode,
  reconnectEdge,
  removeEdge,
  removeNode,
  updateEdgeLabel,
  updateNode,
  createDiagram,
  type Diagram,
  type EdgeEndpoints,
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

interface DiagramState {
  diagram: Diagram;
  editingNodeId: string | null;
  addNodeOfKind: (kind: NodeKind, position: Position) => void;
  moveNodeTo: (nodeId: string, position: Position) => void;
  renameNode: (nodeId: string, label: string) => void;
  removeNodes: (nodeIds: string[]) => void;
  connectNodes: (endpoints: EdgeEndpoints) => void;
  reconnectEdgeTo: (edgeId: string, endpoints: EdgeEndpoints) => void;
  setEdgeLabel: (edgeId: string, label: string) => void;
  removeEdges: (edgeIds: string[]) => void;
  startEditing: (nodeId: string) => void;
  stopEditing: () => void;
  loadExample: () => void;
  clear: () => void;
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export const useDiagramStore = create<DiagramState>((set) => ({
  diagram: exampleDiagram,
  editingNodeId: null,

  addNodeOfKind: (kind, position) => {
    const id = newId('n');
    set((state) => ({
      diagram: addNode(state.diagram, { id, kind, label: DEFAULT_LABELS[kind], position }),
      editingNodeId: id,
    }));
  },

  moveNodeTo: (nodeId, position) =>
    set((state) =>
      state.diagram.nodes.some((node) => node.id === nodeId)
        ? { diagram: moveNode(state.diagram, nodeId, position) }
        : state,
    ),

  renameNode: (nodeId, label) =>
    set((state) => ({ diagram: updateNode(state.diagram, nodeId, { label }) })),

  removeNodes: (nodeIds) =>
    set((state) => ({
      diagram: nodeIds
        .filter((nodeId) => state.diagram.nodes.some((node) => node.id === nodeId))
        .reduce(removeNode, state.diagram),
    })),

  connectNodes: (endpoints) =>
    set((state) => ({ diagram: connect(state.diagram, { id: newId('e'), ...endpoints }) })),

  reconnectEdgeTo: (edgeId, endpoints) =>
    set((state) => ({ diagram: reconnectEdge(state.diagram, edgeId, endpoints) })),

  setEdgeLabel: (edgeId, label) =>
    set((state) => ({ diagram: updateEdgeLabel(state.diagram, edgeId, label.trim()) })),

  removeEdges: (edgeIds) =>
    set((state) => ({ diagram: edgeIds.reduce(removeEdge, state.diagram) })),

  startEditing: (nodeId) => set({ editingNodeId: nodeId }),
  stopEditing: () => set({ editingNodeId: null }),
  loadExample: () => set({ diagram: exampleDiagram, editingNodeId: null }),
  clear: () => set({ diagram: createDiagram('Sin título'), editingNodeId: null }),
}));
