/**
 * 状態駆動のナビゲーション窓口。開発側の接続に使用する。
 *
 * ホストからストアとナビゲーション正規化関数を受け取るため、このモジュールは
 * DOM要素、経路、classicアプリケーションのグローバル変数を知らない。
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
