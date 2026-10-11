import { Handle, Position as Side, type NodeProps } from '@xyflow/react';
import { useDiagramStore } from '../state/diagramStore';
import type { TrazoNode } from './flowAdapter';
import { NodeLabel } from './NodeLabel';

const SIDES = [Side.Top, Side.Right, Side.Bottom, Side.Left] as const;

export function FlowNode({ id, data, selected }: NodeProps<TrazoNode>) {
  const startEditing = useDiagramStore((state) => state.startEditing);

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
      <NodeLabel id={id} label={data.label} />
      {SIDES.map((side) => (
        <Handle key={side} id={side} type="source" position={side} className="tz-handle" />
      ))}
    </div>
  );
}
