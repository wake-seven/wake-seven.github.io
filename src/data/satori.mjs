/** Development-side facade for generated SATORI_STAGES records. */
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
