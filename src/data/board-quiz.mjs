/** 多言語BOARD_QUIZ_COPYの開発側窓口。 */
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
