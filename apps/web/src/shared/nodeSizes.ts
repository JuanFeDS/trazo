import type { NodeKind } from '@trazo/core';

// Deben coincidir con el tamaño fijo que fija el CSS de cada tipo de nodo (ui/app.css).
// La diferencia entre el centro de un nodo normal (30) y el de una decisión (70) es múltiplo
// de la cuadrícula de 20 px: así, al ajustar a la cuadrícula, sus centros quedan alineados.
export const FLOW_WIDTH = 240;
export const FLOW_HEIGHT: Record<NodeKind, number> = { start: 60, process: 60, decision: 140, end: 60 };
export const MIND_ROOT = { width: 220, height: 64 };
export const MIND_NODE = { width: 200, height: 44 };
