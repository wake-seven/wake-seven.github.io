/** Message presenter facade. Rendering policy is supplied by the host app. */
export function createMessagePresenter({ root, catalog, translate = value => value, render = defaultRender } = {}) {
  const show = (id, overrides = {}) => {
    const descriptor = catalog?.descriptor?.(id, overrides);
    if (!descriptor) return null;
    render({ root, descriptor, translate });
    return descriptor;
  };
  const hide = () => { if (root) root.hidden = true; };
  return Object.freeze({ show, hide, descriptor: id => catalog?.descriptor?.(id) ?? null });
}
function defaultRender({ root, descriptor, translate }) {
  if (!root) return;
  root.hidden = false;
  const title = root.querySelector?.('[data-message-title]');
  const body = root.querySelector?.('[data-message-body]');
  if (title) title.textContent = translate(descriptor.title ?? descriptor.id);
  if (body) body.textContent = translate(descriptor.text ?? descriptor.body ?? '');
}
