export interface History<T> {
  past: readonly T[];
  present: T;
  future: readonly T[];
}

export const MAX_HISTORY = 100;

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

// Con `replace` el cambio sustituye el valor actual sin abrir un paso nuevo en el historial.
export function pushHistory<T>(history: History<T>, next: T, replace = false): History<T> {
  if (next === history.present) {
    return history;
  }
  const past = replace ? history.past : [...history.past, history.present].slice(-MAX_HISTORY);
  return { past, present: next, future: [] };
}

export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0;
}

export function canRedo<T>(history: History<T>): boolean {
  return history.future.length > 0;
}

export function undo<T>(history: History<T>): History<T> {
  const previous = history.past.at(-1);
  if (previous === undefined) {
    return history;
  }
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redo<T>(history: History<T>): History<T> {
  const [next, ...rest] = history.future;
  if (next === undefined) {
    return history;
  }
  return { past: [...history.past, history.present], present: next, future: rest };
}
