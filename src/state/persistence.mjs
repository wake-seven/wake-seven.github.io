/** ブラウザのグローバル変数から独立した保存アダプター。 */
export function createPersistence({ storage, key = 'wake7-state-vnext', version = 1, create = value => value } = {}) {
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const read = () => {
    try { const parsed = JSON.parse(storage?.getItem(key) || 'null'); return parsed?.version === version ? create(parsed) : null; } catch { return null; }
  };
  const write = state => {
    try { storage?.setItem(key, JSON.stringify({ ...clone(create(state)), version })); return true; } catch { return false; }
  };
  return Object.freeze({ key, version, read, write });
}
