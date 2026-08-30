/**
 * Declarative event registration for development-side UI integrations.
 * Event targets and handlers are injected; no game globals or DOM selectors
 * are owned by this module.
 */
export function createEventBinder({ target, handlers = {} } = {}) {
  const bindings = [];
  const bind = (type, listener, options) => {
    if (!target || typeof target.addEventListener !== 'function' || typeof listener !== 'function') return false;
    target.addEventListener(type, listener, options);
    bindings.push({ type, listener, options });
    return true;
  };
  const bindAll = () => {
    for (const [type, listener] of Object.entries(handlers)) bind(type, listener);
    return bindings.length;
  };
  const unbindAll = () => {
    if (target && typeof target.removeEventListener === 'function') {
      bindings.forEach(({ type, listener, options }) => target.removeEventListener(type, listener, options));
    }
    const count = bindings.length;
    bindings.length = 0;
    return count;
  };
  return Object.freeze({ bind, bindAll, unbindAll, get size() { return bindings.length; } });
}
