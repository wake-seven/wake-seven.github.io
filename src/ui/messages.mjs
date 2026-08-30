/** Message presenter facade. Rendering policy is supplied by the host app. */
export function createClearMessageModel({ id, title = '', body = '', tip = null, quiz = null, art = '', nextAction = null, ...metadata } = {}) {
  return Object.freeze({ id, title, body, tip, quiz, art, nextAction, metadata: Object.freeze({ ...metadata }) });
}

export function createMessagePresenter({ root, catalog, translate = value => value, render: renderView = defaultRender } = {}) {
  const show = (id, overrides = {}) => {
    const descriptor = catalog?.descriptor?.(id, overrides);
    if (!descriptor) return null;
    renderView({ root, descriptor, translate });
    return descriptor;
  };
  const hide = () => { if (root) root.hidden = true; };
  const render = (message, context = {}) => {
    if (message == null) return false;
    renderView({ root, descriptor: message, translate, context });
    return true;
  };
  return Object.freeze({ show, hide, render, descriptor: id => catalog?.descriptor?.(id) ?? null });
}
function defaultRender({ root, descriptor, translate }) {
  if (!root) return;
  root.hidden = false;
  const title = root.querySelector?.('[data-message-title]');
  const body = root.querySelector?.('[data-message-body]');
  if (title) title.textContent = translate(descriptor.title ?? descriptor.id);
  if (body) body.textContent = translate(descriptor.text ?? descriptor.body ?? '');
}
