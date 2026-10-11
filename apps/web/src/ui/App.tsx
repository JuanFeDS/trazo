import { ReactFlowProvider } from '@xyflow/react';
import { useDiagramStore } from '../state/diagramStore';
import { Canvas } from './Canvas';
import { useTheme } from './useTheme';

export function App() {
  const [theme, toggleTheme] = useTheme();
  const title = useDiagramStore((state) => state.diagram.title);

  return (
    <div className="tz-app">
      <header className="tz-bar">
        <div className="tz-brand">
          <span className="tz-brand__name">Trazo</span>
          <svg className="tz-brand__stroke" viewBox="0 0 120 12" aria-hidden>
            <path d="M3 8 C 25 1, 48 11, 70 5 S 104 3, 117 7" />
          </svg>
        </div>
        <span className="tz-bar__title">{title}</span>
        <button type="button" className="tz-bar__theme" onClick={toggleTheme} aria-label="Cambiar tema">
          {theme === 'dark' ? 'Claro' : 'Oscuro'}
        </button>
      </header>
      <main className="tz-main">
        <ReactFlowProvider>
          <Canvas theme={theme} />
        </ReactFlowProvider>
      </main>
    </div>
  );
}
