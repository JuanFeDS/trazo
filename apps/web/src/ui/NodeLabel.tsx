import { useEffect, useRef, useState } from 'react';
import { useDiagramStore } from '../state/diagramStore';

interface NodeLabelProps {
  id: string;
  label: string;
  tabAddsChild?: boolean;
}

export function NodeLabel({ id, label, tabAddsChild = false }: NodeLabelProps) {
  const isEditing = useDiagramStore((state) => state.editingNodeId === id);
  const renameNode = useDiagramStore((state) => state.renameNode);
  const addChildOf = useDiagramStore((state) => state.addChildOf);
  const stopEditing = useDiagramStore((state) => state.stopEditing);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(label);

  useEffect(() => {
    if (!isEditing) {
      return undefined;
    }
    setDraft(label);
    // React Flow mantiene el nodo oculto hasta medirlo y un elemento oculto no toma foco.
    let frame = 0;
    let attempts = 0;
    const focusWhenVisible = () => {
      const input = inputRef.current;
      input?.focus();
      if (input && document.activeElement === input) {
        input.select();
      } else if (attempts < 20) {
        attempts += 1;
        frame = requestAnimationFrame(focusWhenVisible);
      }
    };
    focusWhenVisible();
    return () => cancelAnimationFrame(frame);
    // Solo al entrar en modo edición; la etiqueta no debe reiniciar el foco.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      renameNode(id, trimmed);
    }
    stopEditing();
  };

  if (!isEditing) {
    return <span className="tz-node__label">{label}</span>;
  }

  return (
    <input
      ref={inputRef}
      className="tz-node__input nodrag"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          commit();
        } else if (event.key === 'Escape') {
          stopEditing();
        } else if (event.key === 'Tab' && tabAddsChild) {
          event.preventDefault();
          commit();
          addChildOf(id);
        }
      }}
    />
  );
}
