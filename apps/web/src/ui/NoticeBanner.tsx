import { useEffect } from 'react';
import { useDiagramStore } from '../state/diagramStore';

const INFO_DURATION_MS = 3500;

export function NoticeBanner() {
  const notice = useDiagramStore((state) => state.notice);
  const dismiss = useDiagramStore((state) => state.dismissNotice);

  useEffect(() => {
    if (notice?.kind !== 'info') {
      return undefined;
    }
    const timer = setTimeout(dismiss, INFO_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notice, dismiss]);

  if (!notice) {
    return null;
  }

  return (
    <div className="tz-notice" data-kind={notice.kind} role={notice.kind === 'error' ? 'alert' : 'status'}>
      <div className="tz-notice__body">
        <strong>{notice.title}</strong>
        {notice.details.length > 0 && (
          <ul>
            {notice.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        )}
      </div>
      <button type="button" className="tz-link" onClick={dismiss}>
        Cerrar
      </button>
    </div>
  );
}
