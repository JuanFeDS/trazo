import { ReactFlowProvider } from '@xyflow/react';
import { useEffect, useState } from 'react';
import { useDiagramStore } from '../state/diagramStore';
import { Canvas } from './Canvas';
import { DocumentsPanel } from './DocumentsPanel';
import { NoticeBanner } from './NoticeBanner';
import { bootDocuments, openFromDisk, saveToDisk } from './documentActions';
import { useServices } from './services';
import { useAutosave } from './useAutosave';
import { useTheme } from './useTheme';

const STATUS_TEXT = {
  saved: 'Guardado en el navegador',
  saving: 'Guardando…',
  error: 'No se pudo guardar',
} as const;

export function App() {
  const services = useServices();
  const [theme, toggleTheme] = useTheme();
  const [panelOpen, setPanelOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const title = useDiagramStore((state) => state.diagram.title);
  const saveStatus = useDiagramStore((state) => state.saveStatus);
  const renameDiagram = useDiagramStore((state) => state.renameDiagram);

  useAutosave(services);

  useEffect(() => {
    void bootDocuments(services).finally(() => setReady(true));
  }, [services]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }
      if (event.key === 's') {
        event.preventDefault();
        void saveToDisk(services);
      } else if (event.key === 'o') {
        event.preventDefault();
        void openFromDisk(services);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [services]);

  if (!ready) {
    return null;
  }

  return (
    <div className="tz-app">
      <header className="tz-bar">
        <div className="tz-brand">
          <span className="tz-brand__name">Trazo</span>
          <svg className="tz-brand__stroke" viewBox="0 0 120 12" aria-hidden>
            <path d="M3 8 C 25 1, 48 11, 70 5 S 104 3, 117 7" />
          </svg>
        </div>
        <button type="button" className="tz-bar__button" onClick={() => setPanelOpen(true)}>
          Diagramas
        </button>
        <input
          className="tz-bar__title"
          value={title}
          placeholder="Sin título"
          aria-label="Título del diagrama"
          onChange={(event) => renameDiagram(event.target.value)}
        />
        <span className="tz-bar__status" data-status={saveStatus}>
          {STATUS_TEXT[saveStatus]}
        </span>
        <button type="button" className="tz-bar__button" onClick={() => void openFromDisk(services)}>
          Abrir
        </button>
        <button type="button" className="tz-bar__button" onClick={() => void saveToDisk(services)}>
          Guardar
        </button>
        <button type="button" className="tz-bar__theme" onClick={toggleTheme} aria-label="Cambiar tema">
          {theme === 'dark' ? 'Claro' : 'Oscuro'}
        </button>
      </header>
      <NoticeBanner />
      <main className="tz-main">
        <ReactFlowProvider>
          <Canvas theme={theme} />
        </ReactFlowProvider>
      </main>
      {panelOpen && <DocumentsPanel onClose={() => setPanelOpen(false)} />}
    </div>
  );
}
