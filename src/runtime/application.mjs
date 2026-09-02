/** イベント、描画、状態保存を接続するアプリケーション境界。 */
export function createApplicationController({ store, events, renderer, session, serialize, onStart, onStop } = {}) {
  const sync = () => {
    const state = typeof serialize === 'function' ? serialize(store?.state) : store?.state;
    if (state !== undefined) session?.save?.(state);
    return state;
  };
  let unsubscribe = () => {};
  let disconnect = () => {};
  const start = () => {
    events?.bindAll?.();
    disconnect = renderer?.connect?.() || (() => {});
    unsubscribe = store?.subscribe?.(() => sync()) || (() => {});
    onStart?.(store?.state);
    return true;
  };
  const stop = () => {
    disconnect();
    disconnect = () => {};
    unsubscribe();
    unsubscribe = () => {};
    events?.unbindAll?.();
    onStop?.(store?.state);
    return true;
  };
  return Object.freeze({ start, stop, sync });
}
