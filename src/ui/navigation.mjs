/**
 * State-driven navigation facade for development-side integrations.
 *
 * The host supplies the store and navigation normalizer, so this module does
 * not know about DOM elements, routes, or the classic application's globals.
 */
export function createNavigationController({ store, normalize = value => value, onNavigate } = {}) {
  const current = () => store?.state?.navigation ?? null;
  const go = (patch = {}) => {
    if (!store || typeof store.updateSection !== 'function') {
      return { ok: false, reason: 'store is unavailable' };
    }
    const next = normalize({ ...(current() || {}), ...patch });
    store.updateSection('navigation', next);
    onNavigate?.(next);
    return { ok: true, navigation: next };
  };
  const setMode = (mode, patch = {}) => go({ ...patch, mode });
  const reset = () => go({ mode: 'stage', lap: 1, stageIndex: 0, masteryIndex: 0, satoriIndex: 0, tutorialStep: 0 });
  return Object.freeze({ current, go, setMode, reset });
}
