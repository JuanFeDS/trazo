import type { Side } from '@trazo/core';
import { useDiagramStore } from '../state/diagramStore';
import type { TrazoEdge } from './flowAdapter';

const SIDE_OPTIONS: { side: Side; glyph: string; name: string }[] = [
  { side: 'top', glyph: '↑', name: 'arriba' },
  { side: 'right', glyph: '→', name: 'derecha' },
  { side: 'bottom', glyph: '↓', name: 'abajo' },
  { side: 'left', glyph: '←', name: 'izquierda' },
];

interface SidePickerProps {
  title: string;
  current: string | null | undefined;
  onPick: (side: Side) => void;
}

function SidePicker({ title, current, onPick }: SidePickerProps) {
  return (
    <span className="tz-sides__group">
      <span className="tz-sides__title">{title}</span>
      {SIDE_OPTIONS.map(({ side, glyph, name }) => (
        <button
          key={side}
          type="button"
          className="tz-sides__button"
          aria-pressed={current === side}
          aria-label={`${title} por ${name}`}
          onClick={() => onPick(side)}
        >
          {glyph}
        </button>
      ))}
    </span>
  );
}

export function EdgeSidesBar({ edge }: { edge: TrazoEdge }) {
  const reconnectEdgeTo = useDiagramStore((state) => state.reconnectEdgeTo);
  const fromSide = edge.sourceHandle as Side;
  const toSide = edge.targetHandle as Side;
  const endpoints = { from: edge.source, to: edge.target, fromSide, toSide };

  return (
    <div className="tz-sides" role="toolbar" aria-label="Lados de la flecha seleccionada">
      <SidePicker
        title="Sale"
        current={edge.sourceHandle}
        onPick={(side) => reconnectEdgeTo(edge.id, { ...endpoints, fromSide: side })}
      />
      <SidePicker
        title="Entra"
        current={edge.targetHandle}
        onPick={(side) => reconnectEdgeTo(edge.id, { ...endpoints, toSide: side })}
      />
    </div>
  );
}
