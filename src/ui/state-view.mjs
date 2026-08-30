/** Read-only projection of store state for UI consumers. */
export function createUiStateView({ store, select = state => state, onChange } = {}) {
  const snapshot = () => {
    const value = select(store?.state);
    return value && typeof value === 'object' ? Object.freeze({ ...value }) : value;
  };
  const subscribe = () => {
    if (!store || typeof store.subscribe !== 'function') return () => {};
    return store.subscribe(state => onChange?.(select(state)));
  };
  return Object.freeze({ snapshot, subscribe });
}
