import type { LayoutEngine } from '@trazo/core';
import { ReactFlowProvider } from '@xyflow/react';
import { selectActiveDiagram, useDiagramStore } from '../state/diagramStore';
import { Canvas } from './Canvas';
import { useTheme } from './useTheme';

const TYPES = [
  { type: 'flowchart', label: 'Diagrama de flujo' },
  { type: 'mindmap', label: 'Mapa mental' },
] as const;

export function App({ layoutEngine }: { layoutEngine: LayoutEngine }) {
  const [theme, toggleTheme] = useTheme();
  const title = useDiagramStore((state) => selectActiveDiagram(state).title);
  const active = useDiagramStore((state) => state.active);
  const setActive = useDiagramStore((state) => state.setActive);

  return (
    <div className="tz-app">
      <header className="tz-bar">
        <div className="tz-brand">
          <span className="tz-brand__name">Trazo</span>
          <svg className="tz-brand__stroke" viewBox="0 0 120 12" aria-hidden>
            <path d="M3 8 C 25 1, 48 11, 70 5 S 104 3, 117 7" />
          </svg>
        </div>
        <div className="tz-segmented" role="tablist" aria-label="Tipo de diagrama">
          {TYPES.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={active === type}
              onClick={() => setActive(type)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="tz-bar__title">{title}</span>
        <button type="button" className="tz-bar__theme" onClick={toggleTheme} aria-label="Cambiar tema">
          {theme === 'dark' ? 'Claro' : 'Oscuro'}
        </button>
      </header>
      <main className="tz-main">
        <ReactFlowProvider>
          <Canvas theme={theme} layoutEngine={layoutEngine} />
        </ReactFlowProvider>
      </main>
    </div>
  );
}
