/** Session lifecycle service, independent from game-specific globals. */
export function createSessionService({ persistence, normalize = value => value, onRestore, onSave } = {}) {
  let current = null;
  const load = () => {
    const stored = typeof persistence?.read === 'function' ? persistence.read() : null;
    current = stored == null ? null : normalize(stored);
    onRestore?.(current);
    return current;
  };
  const save = value => {
    current = normalize(value);
    const saved = typeof persistence?.write === 'function' ? persistence.write(current) : false;
    if (saved) onSave?.(current);
    return saved;
  };
  const clear = () => { current = null; return true; };
  return Object.freeze({ load, save, clear, get current() { return current; } });
}
