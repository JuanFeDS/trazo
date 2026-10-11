import { Handle, Position as Side, type NodeProps } from '@xyflow/react';
import { useDiagramStore } from '../state/diagramStore';
import type { TrazoNode } from './flowAdapter';
import { NodeLabel } from './NodeLabel';

const SIDES = [Side.Left, Side.Right] as const;

export function MindNode({ id, data, selected }: NodeProps<TrazoNode>) {
  const startEditing = useDiagramStore((state) => state.startEditing);

  return (
    <div
      className="tz-mind"
      data-branch={data.branch}
      data-depth={Math.min(data.depth ?? 0, 2)}
      data-selected={selected}
      onDoubleClick={() => startEditing(id)}
    >
      <NodeLabel id={id} label={data.label} tabAddsChild />
      {SIDES.map((side) => (
        <Handle key={`in-${side}`} id={side} type="target" position={side} className="tz-handle" isConnectable={false} />
      ))}
      {SIDES.map((side) => (
        <Handle key={`out-${side}`} id={side} type="source" position={side} className="tz-handle" isConnectable={false} />
      ))}
    </div>
  );
}
