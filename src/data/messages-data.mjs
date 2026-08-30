/** Development-side facade for the classic CLEAR_CONTENT catalog. */
export const MESSAGE_TIMINGS = Object.freeze({ beforeStart: 'beforeStart', afterClear: 'afterClear' });
export const MESSAGE_TYPES = Object.freeze({ dialog: 'dialog', clear: 'clear', quiz: 'quiz', guidance: 'guidance', milestone: 'milestone' });
const clone = value => value == null ? value : structuredClone(value);
const inferType = content => content?.dialog ? MESSAGE_TYPES.dialog
  : content?.quiz ? MESSAGE_TYPES.quiz
    : content?.guidance ? MESSAGE_TYPES.guidance
      : content?.tip || content?.art ? MESSAGE_TYPES.clear : MESSAGE_TYPES.dialog;
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
      const copy = clone(content);
      const override = clone(overrides);
      return Object.freeze({ id, type: override.type || inferType(copy), timing: override.timing || (id.endsWith('before') ? MESSAGE_TIMINGS.beforeStart : MESSAGE_TIMINGS.afterClear), ...copy, ...override });
    }
  });
}
export const messageCatalogFromLegacy = clearContent => createMessageCatalog(clearContent);
