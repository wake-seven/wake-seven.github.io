/** Development-side facade for multilingual BOARD_QUIZ_COPY. */
const clone = value => value == null ? value : structuredClone(value);
export function createBoardQuizCatalog(copy = {}) {
  const records = clone(copy) || {};
  return Object.freeze({
    languages: () => Object.keys(records),
    forLanguage: (language, fallback = 'ja') => clone(records[language] ?? records[fallback] ?? {}),
    hasLanguage: language => Object.prototype.hasOwnProperty.call(records, language),
    all: () => clone(records)
  });
}
