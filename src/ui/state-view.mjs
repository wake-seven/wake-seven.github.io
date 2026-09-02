/** UI利用側へ渡す、ストア状態の読み取り専用投影。 */
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
