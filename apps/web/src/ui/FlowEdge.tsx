import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import { useState } from 'react';
import { useDiagramStore } from '../state/diagramStore';
import type { TrazoEdge } from './flowAdapter';

export function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
  selected,
}: EdgeProps<TrazoEdge>) {
  const setEdgeLabel = useDiagramStore((state) => state.setEdgeLabel);
  const [isEditing, setIsEditing] = useState(false);
  const label = data?.label ?? '';

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 14,
  });

  const commit = (value: string) => {
    setEdgeLabel(id, value);
    setIsEditing(false);
  };

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} className="tz-edge" data-selected={selected} />
      <EdgeLabelRenderer>
        <div
          className="tz-edge__label nodrag nopan"
          data-empty={!label && !isEditing}
          data-selected={selected}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          onDoubleClick={() => setIsEditing(true)}
        >
          {isEditing ? (
            <input
              autoFocus
              defaultValue={label}
              className="tz-edge__input"
              onBlur={(event) => commit(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  commit(event.currentTarget.value);
                } else if (event.key === 'Escape') {
                  setIsEditing(false);
                }
              }}
            />
          ) : (
            label || 'etiqueta'
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
