/** Development-side facade for the classic CLEAR_CONTENT catalog. */
export const MESSAGE_TIMINGS = Object.freeze({ beforeStart: 'beforeStart', afterClear: 'afterClear' });
const clone = value => value == null ? value : structuredClone(value);
export function createMessageCatalog(clearContent = {}) {
  const entries = clone(clearContent) || {};
  return Object.freeze({
    get: id => entries[id] ?? null,
    has: id => Object.prototype.hasOwnProperty.call(entries, id),
    ids: () => Object.keys(entries),
    entries: () => clone(entries),
    descriptor(id, overrides = {}) {
      const content = entries[id];
      if (!content) return null;
      return Object.freeze({ id, timing: id.endsWith('before') ? MESSAGE_TIMINGS.beforeStart : MESSAGE_TIMINGS.afterClear, ...clone(content), ...clone(overrides) });
    }
  });
}
export const messageCatalogFromLegacy = clearContent => createMessageCatalog(clearContent);
