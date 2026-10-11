import type { Diagram, Position } from '../domain/diagram';

export interface LayoutEngine {
  layout(diagram: Diagram): Promise<Record<string, Position>>;
}
