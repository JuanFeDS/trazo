import { listDocuments, type StoredSummary } from '@trazo/core';
import { useCallback, useEffect, useState } from 'react';
import { useDiagramStore } from '../state/diagramStore';
import { deleteStoredDocument, openStoredDocument } from './documentActions';
import { useServices } from './services';

const TYPE_LABEL = { flowchart: 'Flujo', mindmap: 'Mapa' } as const;

const DATE_FORMAT = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' });

export function DocumentsPanel({ onClose }: { onClose: () => void }) {
  const services = useServices();
  const currentId = useDiagramStore((state) => state.documentId);
  const newDocument = useDiagramStore((state) => state.newDocument);
  const [documents, setDocuments] = useState<StoredSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listDocuments(services.repository).then(
      (list) => {
        setDocuments(list);
        setFailed(false);
      },
      () => setFailed(true),
    );
  }, [services]);

  useEffect(refresh, [refresh]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const open = async (id: string) => {
    await openStoredDocument(services, id);
    onClose();
  };

  const create = (type: 'flowchart' | 'mindmap') => {
    newDocument(type);
    onClose();
  };

  const remove = async (id: string) => {
    setConfirmingId(null);
    await deleteStoredDocument(services, id);
    refresh();
  };

  return (
    <div className="tz-drawer-backdrop" onClick={onClose}>
      <aside
        className="tz-drawer"
        role="dialog"
        aria-label="Mis diagramas"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="tz-drawer__head">
          <h2>Mis diagramas</h2>
          <button type="button" className="tz-link" onClick={onClose}>
            Cerrar
          </button>
        </header>

        <div className="tz-drawer__new">
          <button type="button" className="tz-pill" data-kind="process" onClick={() => create('flowchart')}>
            + Diagrama de flujo
          </button>
          <button type="button" className="tz-pill" data-kind="start" onClick={() => create('mindmap')}>
            + Mapa mental
          </button>
        </div>

        {failed && <p className="tz-drawer__empty">No se pudo leer el almacenamiento del navegador.</p>}
        {documents?.length === 0 && (
          <p className="tz-drawer__empty">
            Aún no hay diagramas guardados. Lo que edites se guarda solo en este navegador.
          </p>
        )}

        <ul className="tz-docs">
          {documents?.map((item) => (
            <li key={item.id} className="tz-docs__row" data-current={item.id === currentId}>
              <button type="button" className="tz-docs__open" onClick={() => void open(item.id)}>
                <span className="tz-docs__title">{item.title || 'Sin título'}</span>
                <span className="tz-docs__meta">
                  {TYPE_LABEL[item.type]} · {DATE_FORMAT.format(item.updatedAt)}
                </span>
              </button>
              {confirmingId === item.id ? (
                <span className="tz-docs__confirm">
                  ¿Borrar?
                  <button type="button" className="tz-link" onClick={() => void remove(item.id)}>
                    Sí
                  </button>
                  <button type="button" className="tz-link" onClick={() => setConfirmingId(null)}>
                    No
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="tz-link tz-docs__delete"
                  aria-label={`Borrar ${item.title || 'diagrama sin título'}`}
                  onClick={() => setConfirmingId(item.id)}
                >
                  Borrar
                </button>
              )}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
