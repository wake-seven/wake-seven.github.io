/** Coordinates injected UI event and rendering lifecycles. */
export function createUiLifecycle({ events, renderer, onStart, onStop } = {}) {
  let active = false;
  let disconnect = () => {};
  const start = () => {
    if (active) return false;
    events?.bindAll?.();
    disconnect = renderer?.connect?.() || (() => {});
    active = true;
    onStart?.();
    return true;
  };
  const stop = () => {
    if (!active) return false;
    disconnect();
    disconnect = () => {};
    events?.unbindAll?.();
    active = false;
    onStop?.();
    return true;
  };
  return Object.freeze({ start, stop, get active() { return active; } });
}
