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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { selectActiveDiagram, useDiagramStore } from '../state/diagramStore';
import { EdgeSidesBar } from './EdgeSidesBar';
import { FlowEdge } from './FlowEdge';
import { FlowNode } from './FlowNode';
import { MindEdge } from './MindEdge';
import { MindNode } from './MindNode';
import { mergeEdges, mergeNodes, toEndpoints, type TrazoEdge, type TrazoNode } from './flowAdapter';
import { useServices } from './services';
import type { Theme } from './useTheme';

const FIT_OPTIONS: FitViewOptions = {
  padding: { top: '60px', right: '60px', bottom: '130px', left: '60px' },
};
const NODE_TYPES = { trazo: FlowNode, mind: MindNode };
const EDGE_TYPES = { trazo: FlowEdge, mind: MindEdge };
const KINDS: { kind: NodeKind; label: string }[] = [
  { kind: 'start', label: 'Inicio' },
  { kind: 'process', label: 'Proceso' },
  { kind: 'decision', label: 'Decisión' },
  { kind: 'end', label: 'Fin' },
];

export function Canvas({ theme }: { theme: Theme }) {
  const { layoutEngine } = useServices();
  const diagram = useDiagramStore(selectActiveDiagram);
  const documentId = useDiagramStore((state) => state.documentId);
  const autoPositions = useDiagramStore((state) => state.autoPositions);
  const selectedNodeIds = useDiagramStore((state) => state.selectedNodeIds);
  const actions = useDiagramStore.getState();
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [nodes, setNodes] = useState<TrazoNode[]>([]);
  const [edges, setEdges] = useState<TrazoEdge[]>([]);
  const [connecting, setConnecting] = useState(false);
  const fitPending = useRef(true);
  const isMindmap = diagram.type === 'mindmap';

  const structureKey = useMemo(
    () =>
      diagram.type === 'flowchart'
        ? JSON.stringify([diagram.nodes.map((node) => [node.id, node.kind]), diagram.edges.map((edge) => [edge.from, edge.to])])
        : JSON.stringify(diagram.nodes.map((node) => [node.id, node.parent])),
    [diagram],
  );

  useEffect(() => {
    fitPending.current = true;
  }, [documentId]);

  useEffect(() => {
    let cancelled = false;
    void layoutEngine.layout(diagram).then((positions) => {
      if (cancelled) {
        return;
      }
      actions.setAutoPositions(positions);
      if (fitPending.current) {
        fitPending.current = false;
        setTimeout(() => void fitView({ ...FIT_OPTIONS, duration: 300 }), 80);
      }
    });
    return () => {
      cancelled = true;
    };
    // El layout depende de la estructura, no de las posiciones que mueve el usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey, layoutEngine]);

  useEffect(() => {
    setNodes((previous) => mergeNodes(diagram, previous, autoPositions, selectedNodeIds));
    setEdges((previous) => mergeEdges(diagram, previous, autoPositions));
  }, [diagram, autoPositions, selectedNodeIds]);

  useEffect(() => {
    if (!isMindmap) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      const selectedId = useDiagramStore.getState().selectedNodeIds.at(-1);
      if (!selectedId) {
        return;
      }
      const store = useDiagramStore.getState();
      if (event.key === 'Tab') {
        event.preventDefault();
        store.addChildOf(selectedId);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        store.addSiblingOf(selectedId);
      } else if (event.key === 'F2') {
        event.preventDefault();
        store.startEditing(selectedId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMindmap]);

  const onNodesChange = useCallback(
    (changes: NodeChange<TrazoNode>[]) => {
      setNodes((previous) => applyNodeChanges(changes, previous));
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          actions.moveNodeTo(change.id, change.position);
        } else if (change.type === 'remove') {
          actions.removeNodes([change.id]);
        } else if (change.type === 'select') {
          actions.selectNode(change.id, change.selected);
        }
      }
    },
    // Las acciones del store son estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<TrazoEdge>[]) => {
      setEdges((previous) => applyEdgeChanges(changes, previous));
      const removed = changes.flatMap((change) => (change.type === 'remove' ? [change.id] : []));
      if (removed.length > 0) {
        actions.removeEdges(removed);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const onConnect = useCallback((connection: Connection) => {
    const endpoints = toEndpoints(connection);
    if (endpoints) {
      useDiagramStore.getState().connectNodes(endpoints);
    }
  }, []);

  const onReconnect = useCallback((oldEdge: TrazoEdge, connection: Connection) => {
    const endpoints = toEndpoints(connection);
    if (endpoints) {
      useDiagramStore.getState().reconnectEdgeTo(oldEdge.id, endpoints);
    }
  }, []);

  const addAtCenter = (kind: NodeKind) => {
    const jitter = () => (Math.random() - 0.5) * 80;
    const position = screenToFlowPosition({
      x: window.innerWidth / 2 + jitter(),
      y: window.innerHeight / 2 + jitter(),
    });
    actions.addFlowNode(kind, position);
  };

  const selectedId = selectedNodeIds.at(-1);
  const selectedEdge = edges.find((edge) => edge.selected);

  return (
    <div className="tz-canvas" data-connecting={connecting}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        reconnectRadius={10}
        connectionRadius={80}
        onConnectStart={() => setConnecting(true)}
        onConnectEnd={() => setConnecting(false)}
        onReconnectStart={() => setConnecting(true)}
        onReconnectEnd={() => setConnecting(false)}
        nodesConnectable={!isMindmap}
        edgesReconnectable={!isMindmap}
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

      {!isMindmap && diagram.nodes.length === 0 && (
        <div className="tz-empty">
          <p className="tz-empty__title">
            Un lienzo en blanco, <em>listo para trazar</em>.
          </p>
          <p className="tz-empty__hint">Agrega tu primer nodo abajo, o parte de un ejemplo.</p>
          <button type="button" className="tz-link" onClick={actions.loadExample}>
            Cargar el ejemplo de inicio de sesión →
          </button>
        </div>
      )}

      {!isMindmap && selectedEdge && <EdgeSidesBar edge={selectedEdge} />}

      <div className="tz-palette" role="toolbar" aria-label={isMindmap ? 'Editar mapa mental' : 'Agregar nodos'}>
        {isMindmap ? (
          <>
            <button
              type="button"
              className="tz-palette__item"
              data-branch="0"
              disabled={!selectedId}
              onClick={() => selectedId && actions.addChildOf(selectedId)}
            >
              <span className="tz-palette__dot" aria-hidden />
              Hijo <kbd>Tab</kbd>
            </button>
            <button
              type="button"
              className="tz-palette__item"
              data-branch="1"
              disabled={!selectedId}
              onClick={() => selectedId && actions.addSiblingOf(selectedId)}
            >
              <span className="tz-palette__dot" aria-hidden />
              Hermano <kbd>Enter</kbd>
            </button>
          </>
        ) : (
          KINDS.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              className="tz-palette__item"
              data-kind={kind}
              onClick={() => addAtCenter(kind)}
            >
              <span className="tz-palette__dot" aria-hidden />
              {label}
            </button>
          ))
        )}
        <button type="button" className="tz-palette__item tz-palette__item--plain" onClick={actions.rearrange}>
          Reordenar
        </button>
        <span className="tz-palette__hint">
          {isMindmap ? 'F2 edita · Supr borra la rama' : 'doble clic edita · Supr borra'}
        </span>
      </div>
    </div>
  );
}
