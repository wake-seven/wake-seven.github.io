/** Small ESM store contract for development-side integrations. */
export function createGameStore(initial = {}) {
  let state = structuredClone(initial);
  const listeners = new Set();
  return Object.freeze({
    get state() { return state; },
    update(patch = {}) { state = { ...state, ...structuredClone(patch) }; listeners.forEach(listener => listener(state)); return state; },
    subscribe(listener) { if (typeof listener !== 'function') return () => {}; listeners.add(listener); return () => listeners.delete(listener); }
  });
}
