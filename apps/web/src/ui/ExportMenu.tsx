import { useEffect, useRef, useState } from 'react';
import { exportDiagram } from './documentActions';
import { useServices } from './services';

const FORMATS = [
  { format: 'svg', label: 'SVG', hint: 'vectorial, editable' },
  { format: 'png', label: 'PNG', hint: 'imagen, doble resolución' },
  { format: 'json', label: 'JSON', hint: 'el diagrama, para abrirlo en Trazo' },
] as const;

export function ExportMenu() {
  const services = useServices();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const run = async (format: (typeof FORMATS)[number]['format']) => {
    setOpen(false);
    setBusy(true);
    await exportDiagram(services, format);
    setBusy(false);
  };

  return (
    <div className="tz-menu" ref={container}>
      <button
        type="button"
        className="tz-bar__button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((current) => !current)}
      >
        {busy ? 'Exportando…' : 'Exportar'}
      </button>
      {open && (
        <ul className="tz-menu__list" role="menu">
          {FORMATS.map(({ format, label, hint }) => (
            <li key={format} role="none">
              <button type="button" role="menuitem" className="tz-menu__item" onClick={() => void run(format)}>
                <strong>{label}</strong>
                <span>{hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
