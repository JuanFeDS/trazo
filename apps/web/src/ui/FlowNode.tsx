import { Handle, Position as Side, type NodeProps } from '@xyflow/react';
import { useEffect, useRef, useState } from 'react';
import { useDiagramStore } from '../state/diagramStore';
import type { TrazoNode } from './flowAdapter';

const SIDES = [Side.Top, Side.Right, Side.Bottom, Side.Left] as const;

export function FlowNode({ id, data, selected }: NodeProps<TrazoNode>) {
  const isEditingFromStore = useDiagramStore((state) => state.editingNodeId === id);
  const renameNode = useDiagramStore((state) => state.renameNode);
  const startEditing = useDiagramStore((state) => state.startEditing);
  const stopEditing = useDiagramStore((state) => state.stopEditing);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(data.label);

  useEffect(() => {
    if (!isEditingFromStore) {
      return undefined;
    }
    setDraft(data.label);
    // React Flow mantiene el nodo oculto hasta medirlo y un elemento oculto no toma foco.
    let frame = 0;
    let attempts = 0;
    const focusWhenVisible = () => {
      const input = inputRef.current;
      input?.focus();
      if (input && document.activeElement === input) {
        input.select();
      } else if (attempts < 20) {
        attempts += 1;
        frame = requestAnimationFrame(focusWhenVisible);
      }
    };
    focusWhenVisible();
    return () => cancelAnimationFrame(frame);
    // Solo al entrar en modo edición; la etiqueta no debe reiniciar el foco.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditingFromStore]);

  const commit = () => {
    const label = draft.trim();
    if (label) {
      renameNode(id, label);
    }
    stopEditing();
  };

  return (
    <div
      className="tz-node"
      data-kind={data.kind}
      data-selected={selected}
      onDoubleClick={() => startEditing(id)}
    >
      {data.kind === 'decision' && (
        <svg className="tz-node__shape" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden>
          <polygon points="50,1.5 98.5,30 50,58.5 1.5,30" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      {isEditingFromStore ? (
        <input
          ref={inputRef}
          className="tz-node__input nodrag"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commit();
            } else if (event.key === 'Escape') {
              stopEditing();
            }
          }}
        />
      ) : (
        <span className="tz-node__label">{data.label}</span>
      )}
      {SIDES.map((side) => (
        <Handle key={side} id={side} type="source" position={side} className="tz-handle" />
      ))}
    </div>
  );
}
