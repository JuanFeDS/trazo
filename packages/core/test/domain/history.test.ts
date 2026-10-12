import { describe, expect, it } from 'vitest';
import {
  MAX_HISTORY,
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  redo,
  undo,
} from '../../src/domain/history';

const after = (...values: number[]) => values.reduce((history, value) => pushHistory(history, value), createHistory(0));

describe('historial', () => {
  it('empieza sin nada que deshacer ni rehacer', () => {
    const history = createHistory(0);
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
    expect(undo(history)).toBe(history);
    expect(redo(history)).toBe(history);
  });

  it('deshace y rehace en orden', () => {
    const history = after(1, 2, 3);
    const back = undo(undo(history));
    expect(back.present).toBe(1);
    expect(redo(back).present).toBe(2);
    expect(redo(redo(back)).present).toBe(3);
  });

  it('un cambio nuevo descarta lo que se podía rehacer', () => {
    const forked = pushHistory(undo(after(1, 2)), 9);
    expect(forked.present).toBe(9);
    expect(canRedo(forked)).toBe(false);
    expect(undo(forked).present).toBe(1);
  });

  it('ignora un cambio que deja el mismo valor', () => {
    const history = after(1);
    expect(pushHistory(history, 1)).toBe(history);
  });

  it('con replace sustituye el valor sin abrir un paso nuevo', () => {
    const merged = pushHistory(pushHistory(createHistory(0), 1), 2, true);
    expect(merged.present).toBe(2);
    expect(merged.past).toEqual([0]);
    expect(undo(merged).present).toBe(0);
  });

  it('limita el tamaño del historial', () => {
    const history = Array.from({ length: MAX_HISTORY + 20 }, (_, index) => index + 1).reduce(
      (acc, value) => pushHistory(acc, value),
      createHistory(0),
    );
    expect(history.past).toHaveLength(MAX_HISTORY);
    expect(history.past[0]).toBe(20);
  });
});
