/** 開発側の接続に使う小さなESM状態ストア契約。 */
export function createGameStore(initial = {}) {
  const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  let state = clone(initial);
  const listeners = new Set();
  return Object.freeze({
    get state() { return state; },
    update(patch = {}) { state = { ...state, ...clone(patch) }; listeners.forEach(listener => listener(state, { type: 'update' })); return state; },
    updateSection(section, patch = {}) { return this.update({ [section]: { ...(state[section] || {}), ...clone(patch) } }); },
    replace(next = {}) { state = clone(next); listeners.forEach(listener => listener(state, { type: 'replace' })); return state; },
    subscribe(listener) { if (typeof listener !== 'function') return () => {}; listeners.add(listener); return () => listeners.delete(listener); }
  });
}
