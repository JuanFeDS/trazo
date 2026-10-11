import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';
import type { TrazoEdge } from './flowAdapter';

export function MindEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<TrazoEdge>) {
  const [path] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  return <BaseEdge id={id} path={path} className="tz-mind-edge" data-branch={data?.branch} />;
}
