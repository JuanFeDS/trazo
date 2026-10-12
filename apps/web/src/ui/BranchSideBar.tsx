import { computeSides, type MindmapDiagram, type MindSide } from '@trazo/core';
import { useDiagramStore } from '../state/diagramStore';

export const SIDE_OPTIONS: { side: MindSide; glyph: string; name: string; key: string }[] = [
  { side: 'left', glyph: '←', name: 'izquierda', key: 'ArrowLeft' },
  { side: 'right', glyph: '→', name: 'derecha', key: 'ArrowRight' },
  { side: 'top', glyph: '↑', name: 'arriba', key: 'ArrowUp' },
  { side: 'bottom', glyph: '↓', name: 'abajo', key: 'ArrowDown' },
];

export function isTopLevelBranch(diagram: MindmapDiagram, nodeId: string): boolean {
  const node = diagram.nodes.find((candidate) => candidate.id === nodeId);
  const parent = diagram.nodes.find((candidate) => candidate.id === node?.parent);
  return Boolean(node && parent && parent.parent === null);
}

export function BranchSideBar({ diagram, nodeId }: { diagram: MindmapDiagram; nodeId: string }) {
  const setBranchSideOf = useDiagramStore((state) => state.setBranchSideOf);
  const current = computeSides(diagram)[nodeId];

  return (
    <div className="tz-sides" role="toolbar" aria-label="Lado de la rama seleccionada">
      <span className="tz-sides__group">
        <span className="tz-sides__title">Rama hacia</span>
        {SIDE_OPTIONS.map(({ side, glyph, name }) => (
          <button
            key={side}
            type="button"
            className="tz-sides__button"
            aria-pressed={current === side}
            aria-label={`Mover la rama hacia ${name}`}
            title={`Mover la rama hacia ${name} (Alt+${glyph})`}
            onClick={() => setBranchSideOf(nodeId, side)}
          >
            {glyph}
          </button>
        ))}
      </span>
    </div>
  );
}
