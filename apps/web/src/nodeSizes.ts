import type { NodeKind } from '@trazo/core';

// Deben coincidir con el tamaño fijo que fija el CSS de cada tipo de nodo (ui/app.css).
export const FLOW_WIDTH = 240;
export const FLOW_HEIGHT: Record<NodeKind, number> = { start: 52, process: 52, decision: 120, end: 52 };
export const MIND_ROOT = { width: 220, height: 64 };
export const MIND_NODE = { width: 200, height: 44 };
