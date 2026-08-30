/**
 * Development command boundary for board actions.
 * The classic implementation can be injected at the edge; this module owns
 * neither DOM access nor persistence policy.
 */
export function createBoardCommands({ getBoard, setBoard, applyMove, undoMove } = {}) {
  const current = () => typeof getBoard === 'function' ? getBoard() : null;
  const apply = (triangleIndex, direction, options = {}) => {
    if (typeof applyMove !== 'function') return { ok: false, reason: 'applyMove is unavailable' };
    const result = applyMove(current(), triangleIndex, direction, options);
    if (result?.board && typeof setBoard === 'function') setBoard(result.board);
    return result ?? { ok: true };
  };
  const undo = (...args) => {
    if (typeof undoMove !== 'function') return { ok: false, reason: 'undoMove is unavailable' };
    const result = undoMove(current(), ...args);
    if (result?.board && typeof setBoard === 'function') setBoard(result.board);
    return result ?? { ok: true };
  };
  return Object.freeze({ apply, undo });
}
