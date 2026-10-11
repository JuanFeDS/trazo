import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type FitViewOptions,
  type NodeChange,
} from '@xyflow/react';
import type { NodeKind } from '@trazo/core';
import { useCallback, useEffect, useState } from 'react';
import { useDiagramStore } from '../state/diagramStore';
import { FlowEdge } from './FlowEdge';
import { FlowNode } from './FlowNode';
import { mergeEdges, mergeNodes, toEndpoints, type TrazoEdge, type TrazoNode } from './flowAdapter';
import type { Theme } from './useTheme';

const FIT_OPTIONS: FitViewOptions = {
  padding: { top: '60px', right: '60px', bottom: '130px', left: '60px' },
};
const NODE_TYPES = { trazo: FlowNode };
const EDGE_TYPES = { trazo: FlowEdge };
const KINDS: { kind: NodeKind; label: string }[] = [
  { kind: 'start', label: 'Inicio' },
  { kind: 'process', label: 'Proceso' },
  { kind: 'decision', label: 'Decisión' },
  { kind: 'end', label: 'Fin' },
];

export function Canvas({ theme }: { theme: Theme }) {
  const diagram = useDiagramStore((state) => state.diagram);
  const {
    addNodeOfKind,
    moveNodeTo,
    removeNodes,
    connectNodes,
    reconnectEdgeTo,
    removeEdges,
    loadExample,
  } = useDiagramStore.getState();
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [nodes, setNodes] = useState<TrazoNode[]>([]);
  const [edges, setEdges] = useState<TrazoEdge[]>([]);

  useEffect(() => {
    setNodes((previous) => mergeNodes(diagram, previous));
    setEdges((previous) => mergeEdges(diagram, previous));
  }, [diagram]);

  const onNodesChange = useCallback(
    (changes: NodeChange<TrazoNode>[]) => {
      setNodes((previous) => applyNodeChanges(changes, previous));
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          moveNodeTo(change.id, change.position);
        } else if (change.type === 'remove') {
          removeNodes([change.id]);
        }
      }
    },
    [moveNodeTo, removeNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<TrazoEdge>[]) => {
      setEdges((previous) => applyEdgeChanges(changes, previous));
      const removed = changes.flatMap((change) => (change.type === 'remove' ? [change.id] : []));
      if (removed.length > 0) {
        removeEdges(removed);
      }
    },
    [removeEdges],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const endpoints = toEndpoints(connection);
      if (endpoints) {
        connectNodes(endpoints);
      }
    },
    [connectNodes],
  );

  const onReconnect = useCallback(
    (oldEdge: TrazoEdge, connection: Connection) => {
      const endpoints = toEndpoints(connection);
      if (endpoints) {
        reconnectEdgeTo(oldEdge.id, endpoints);
      }
    },
    [reconnectEdgeTo],
  );

  const addAtCenter = (kind: NodeKind) => {
    const jitter = () => (Math.random() - 0.5) * 80;
    const position = screenToFlowPosition({
      x: window.innerWidth / 2 + jitter(),
      y: window.innerHeight / 2 + jitter(),
    });
    addNodeOfKind(kind, position);
  };

  useEffect(() => {
    if (diagram.nodes.length > 0) {
      void fitView({ ...FIT_OPTIONS, duration: 300 });
    }
    // Solo al cargar un diagrama completo, no en cada edición.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram.title]);

  return (
    <div className="tz-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        reconnectRadius={7}
        connectionMode={ConnectionMode.Loose}
        snapToGrid
        snapGrid={[20, 20]}
        colorMode={theme}
        fitView
        fitViewOptions={FIT_OPTIONS}
        minZoom={0.25}
        maxZoom={2}
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1.6} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>

      {diagram.nodes.length === 0 && (
        <div className="tz-empty">
          <p className="tz-empty__title">
            Un lienzo en blanco, <em>listo para trazar</em>.
          </p>
          <p className="tz-empty__hint">Agrega tu primer nodo abajo, o parte de un ejemplo.</p>
          <button type="button" className="tz-link" onClick={loadExample}>
            Cargar el ejemplo de inicio de sesión →
          </button>
        </div>
      )}

      <div className="tz-palette" role="toolbar" aria-label="Agregar nodos">
        {KINDS.map(({ kind, label }) => (
          <button key={kind} type="button" className="tz-palette__item" data-kind={kind} onClick={() => addAtCenter(kind)}>
            <span className="tz-palette__dot" aria-hidden />
            {label}
          </button>
        ))}
        <span className="tz-palette__hint">doble clic edita · Supr borra</span>
      </div>
    </div>
  );
}
