import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const REGISTRY_CANDIDATES = [
  'scripts/feature-registry.json',
  'feature-registry.json',
  'docs/feature-registry.json'
];

export function normalizeRepoPath(value, root = process.cwd()) {
  const raw = String(value ?? '').replaceAll('\\', '/');
  const absolute = resolve(root, raw);
  const relativePath = relative(root, absolute).replaceAll('\\', '/');
  return relativePath === '' ? '.' : relativePath;
}

function registryEntries(registry) {
  const raw = registry.features || registry.feature || registry.items || registry;
  return Array.isArray(raw)
    ? raw.map((item, index) => [item?.name || item?.id || String(index), item])
    : Object.entries(raw || {});
}

function pathValue(value) {
  return String(value?.path || value?.file || value || '')
    .replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '').toLowerCase();
}

// 影響調査と変更範囲監査が同じ登録パターン規則を使うための共有入口。
export function matchesRegisteredPath(registered, changed) {
  const pattern = pathValue(registered);
  const path = pathValue(changed);
  if (!pattern || !path) return false;
  if (pattern.endsWith('/')) return path.startsWith(pattern);
  if (pattern.endsWith('-')) return path.startsWith(pattern);
  return pattern === path || path.endsWith(`/${pattern}`);
}

export async function findRegistry(root) {
  for (const candidate of REGISTRY_CANDIDATES) {
    const path = join(root, candidate);
    if (await access(path, constants.F_OK).then(() => true, () => false)) return path;
  }
  throw new Error('feature-registry.json が未整備です。');
}

export async function loadFeatureRegistry(root) {
  const registryPath = await findRegistry(root);
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  return { registryPath, registry, entries: registryEntries(registry) };
}

export function selectFeatures(entries, { feature, files = [] } = {}) {
  const featureQuery = feature ? String(feature).toLowerCase() : null;
  const changed = files.map((file) => pathValue(normalizeRepoPath(file, process.cwd())));
  return entries.filter(([name, item]) => {
    if (featureQuery && name.toLowerCase() === featureQuery) return true;
    const registered = item.paths || item.files || [];
    return changed.some((file) => registered.some((candidate) => matchesRegisteredPath(candidate, file)));
  });
}

const list = (value) => value == null ? [] : Array.isArray(value)
  ? value.map((item) => typeof item === 'object' ? item : String(item))
  : [typeof value === 'object' ? value : String(value)];

export function buildInvestigationResult({ root, registryPath, feature, files, matching }) {
  return {
    schemaVersion: 1,
    name: 'wake7-feature-investigation',
    status: 'passed',
    query: feature || (files.length === 1 ? { file: files[0] } : { files }),
    registry: relative(root, registryPath).replaceAll('\\', '/'),
    generatedAt: new Date().toISOString(),
    features: matching.map(([name, item]) => ({
      name,
      entry: list(item.entry),
      state: list(item.state),
      storage: list(item.storage),
      dom: list(item.dom),
      transitions: list(item.transitions || item.next),
      e2e: list(item.e2e || item.relatedE2E),
      files: list(item.files || item.paths),
      boundaries: list(item.boundaries),
      checks: list(item.checks)
    }))
  };
}

export async function investigateFeatures({ root, feature, files = [] }) {
  const loaded = await loadFeatureRegistry(root);
  const matching = selectFeatures(loaded.entries, { feature, files });
  if (!matching.length) {
    throw new Error(`調査対象が feature-registry.json に見つかりません: ${feature || files.join(', ')}`);
  }
  return buildInvestigationResult({ ...loaded, root, feature, files, matching });
}

export function formatInvestigation(result) {
  return result.features.map((item) => [
    `機能調査: ${item.name}`,
    `入口: ${item.entry.join(', ') || 'なし'}`,
    `状態: ${item.state.join(', ') || 'なし'}`,
    `保存: ${item.storage.join(', ') || 'なし'}`,
    `DOM: ${item.dom.join(', ') || 'なし'}`,
    `次の入口: ${item.transitions.join(', ') || 'なし'}`,
    `E2E: ${item.e2e.join(', ') || 'なし'}`,
    `境界: ${item.boundaries.join(', ') || 'なし'}`,
    `検査: ${item.checks.join(', ') || 'なし'}`,
    `関連ファイル: ${item.files.join(', ') || 'なし'}`
  ].join('\n')).join('\n');
}
