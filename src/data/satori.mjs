/** 生成済みSATORI_STAGESレコードの開発側窓口。 */
const clone = value => value == null ? value : structuredClone(value);
export function createSatoriCatalog(stages = []) {
  const records = clone(stages) || [];
  return Object.freeze({
    get length() { return records.length; },
    at: index => records.at(index) ?? null,
    all: () => clone(records),
    byDepth: depth => clone(records.filter(stage => stage?.par === depth)),
    findByState: state => clone(records.find(stage => stage?.state === state) ?? null)
  });
}
