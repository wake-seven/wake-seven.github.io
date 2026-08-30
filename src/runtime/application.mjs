/** Application boundary for wiring events, rendering, and state persistence. */
export function createApplicationController({ store, events, renderer, session, serialize, onStart, onStop } = {}) {
  const sync = () => {
    const state = typeof serialize === 'function' ? serialize(store?.state) : store?.state;
    if (state !== undefined) session?.save?.(state);
    return state;
  };
  const start = () => {
    events?.bindAll?.();
    renderer?.connect?.();
    onStart?.(store?.state);
    return true;
  };
  const stop = () => {
    renderer?.disconnect?.();
    events?.unbindAll?.();
    onStop?.(store?.state);
    return true;
  };
  return Object.freeze({ start, stop, sync });
}
