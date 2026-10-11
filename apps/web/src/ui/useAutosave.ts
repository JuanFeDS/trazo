import type { Diagram } from '@trazo/core';
import { useEffect, useRef } from 'react';
import { useDiagramStore } from '../state/diagramStore';
import { persistNow } from './documentActions';
import type { Services } from './services';

const DEBOUNCE_MS = 600;

interface Pending {
  documentId: string;
  diagram: Diagram;
}

export function useAutosave(services: Services): void {
  const diagram = useDiagramStore((state) => state.diagram);
  const documentId = useDiagramStore((state) => state.documentId);
  const baseline = useRef<Diagram>(diagram);
  const pending = useRef<Pending | null>(null);

  // Debe ir antes del efecto de guardado: lo recién cargado es la nueva línea base, no una edición.
  useEffect(() => {
    baseline.current = useDiagramStore.getState().diagram;
  }, [documentId]);

  useEffect(() => {
    const store = useDiagramStore.getState();
    const flush = () => {
      const job = pending.current;
      if (!job) {
        return Promise.resolve();
      }
      pending.current = null;
      return persistNow(services, job.documentId, job.diagram).then(
        () => store.setSaveStatus('saved'),
        (error: unknown) => {
          store.setSaveStatus('error');
          store.showNotice({
            kind: 'error',
            title: 'No se pudo guardar en el navegador',
            details: [error instanceof Error ? error.message : String(error)],
          });
        },
      );
    };

    if (pending.current && pending.current.documentId !== documentId) {
      void flush();
    }
    if (diagram === baseline.current) {
      return undefined;
    }
    pending.current = { documentId, diagram };
    store.setSaveStatus('saving');
    const timer = setTimeout(() => void flush(), DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `services` es estable durante la vida de la app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram, documentId]);

  useEffect(() => {
    const flushOnHide = () => {
      const job = pending.current;
      if (job && document.visibilityState === 'hidden') {
        pending.current = null;
        void persistNow(services, job.documentId, job.diagram);
      }
    };
    document.addEventListener('visibilitychange', flushOnHide);
    window.addEventListener('pagehide', flushOnHide);
    return () => {
      document.removeEventListener('visibilitychange', flushOnHide);
      window.removeEventListener('pagehide', flushOnHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
