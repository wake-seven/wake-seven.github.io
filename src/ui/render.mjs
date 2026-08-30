/**
 * State-to-view coordination for development-side integrations.
 * Views and renderers are injected so this module remains usable without a
 * DOM and does not depend on the classic application's global state.
 */
export function createRenderCoordinator({ store, boardView, messagePresenter, renderers = {} } = {}) {
  const registry=createRendererRegistry(renderers);
  const render = (state = store?.state, context = {}) => {
    if (!state) return { ok: false, reason: 'state is unavailable' };
    const results = {};
    if (boardView && typeof boardView.render === 'function') {
      results.board = boardView.render(state.board, context);
    }
    if (messagePresenter && typeof messagePresenter.render === 'function') {
      results.messages = messagePresenter.render(state.messages, context);
    }
    for (const name of registry.names()) results[name]=registry.get(name).render(state,context);
    return { ok: true, results, state };
  };
  const connect = () => {
    if (!store || typeof store.subscribe !== 'function') return () => {};
    return store.subscribe((state, event) => render(state, { event }));
  };
  return Object.freeze({ render, connect });
}

// 画面単位のrendererを名前で解決する境界。イベントやDOMを保持しない。
export function createRendererRegistry(renderers = {}) {
  const entries = new Map(Object.entries(renderers).map(([name, render]) => [name, Object.freeze({
    render: typeof render === 'function' ? render : () => ({ ok: false, reason: 'renderer is unavailable' })
  })]));
  return Object.freeze({ get: name => entries.get(name) ?? null, names: () => [...entries.keys()] });
}
