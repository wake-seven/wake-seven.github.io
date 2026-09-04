import { access, readFile, writeFile, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, relative, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

// Feature registry を正本に、入口から状態・DOM・遷移・E2E・検査までを
// 一つの調査結果として表示する。レジストリの詳細な項目名は移行途中でも
// 扱えるよう、単数/複数形と代表的な別名を受け入れる。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const registryCandidates = [
  join(root, 'scripts', 'feature-registry.json'),
  join(root, 'feature-registry.json'),
  join(root, 'docs', 'feature-registry.json'),
  join(root, 'build', 'report', 'feature-registry.json')
];

const args = process.argv.slice(2);
const json = args.includes('--json');
const help = args.includes('--help') || args.includes('-h');
const fileIndex = args.indexOf('--file');
const file = fileIndex >= 0 ? args[fileIndex + 1] : null;
const positional = args.filter((arg, index) => !arg.startsWith('-') && index !== fileIndex + 1);
const feature = positional[0];

if (help || (!feature && !file)) {
  console.log('使い方: npm run investigate -- <feature>');
  console.log('        npm run investigate -- --file <path>');
  console.log('        npm run investigate -- <feature> --json');
  process.exitCode = help ? 0 : 1;
  process.exit();
}

const exists = async path => access(path, constants.F_OK).then(() => true, () => false);
const registryPath = (await Promise.all(registryCandidates.map(async path => ({ path, found: await exists(path) })))).find(item => item.found)?.path;
if (!registryPath) {
  console.error('feature-registry.json が未整備です。');
  console.error('機能レジストリを scripts/feature-registry.json に追加してから再実行してください。');
  console.error('期待する項目: feature（または features）、entry、state、storage、dom、transitions、e2e、files、checks');
  process.exitCode = 1;
  process.exit();
}

let registry;
try {
  registry = JSON.parse(await readFile(registryPath, 'utf8'));
} catch (error) {
  console.error(`feature-registry.json を読み込めません: ${error.message}`);
  process.exitCode = 1;
  process.exit();
}

const asArray = value => value == null ? [] : Array.isArray(value) ? value : [value];
const text = value => typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value);
const lower = value => text(value).toLowerCase().replaceAll('\\', '/');
const fields = {
  entry: ['entry', 'entries', 'mainEntry', 'mainEntries', 'entrypoint', 'entrypoints', '入口', '主要入口'],
  state: ['state', 'states', '状態'], storage: ['storage', 'storages', 'persist', 'persistence', '保存', '保存先'],
  dom: ['dom', 'doms', 'elements', 'selectors', 'DOM'],
  transitions: ['transitions', 'transition', 'next', 'nextTransitions', 'progression', '遷移', '次遷移'],
  e2e: ['e2e', 'e2es', 'tests', 'test', 'e2eCases', 'E2E'],
  files: ['files', 'file', 'relatedFiles', 'sources', 'related', '関連ファイル'],
  checks: ['checks', 'check', '検査', '検証']
};
const getField = (item, kind) => {
  for (const key of fields[kind]) if (item && item[key] !== undefined) return item[key];
  return [];
};
const featureEntries = registry.features || registry.feature || registry.items || registry;
const entries = Array.isArray(featureEntries)
  ? featureEntries.map((item, index) => [item?.name || item?.id || String(index), item])
  : Object.entries(featureEntries || {});
const requestedFile = file ? lower(normalize(file)) : null;
const matching = entries.filter(([name, item]) => {
  if (feature && (name === feature || lower(name) === lower(feature))) return true;
  if (!requestedFile) return false;
  return asArray(getField(item, 'files')).some(candidate => {
    const candidatePath = lower(candidate?.path || candidate?.file || candidate);
    return candidatePath === requestedFile || candidatePath.endsWith(`/${requestedFile}`) || requestedFile.endsWith(`/${candidatePath}`);
  });
});

if (!matching.length) {
  const query = feature || `--file ${file}`;
  console.error(`調査対象が feature-registry.json に見つかりません: ${query}`);
  console.error(`利用可能な feature: ${entries.map(([name]) => name).join(', ') || '(なし)'}`);
  process.exitCode = 1;
  process.exit();
}

const simplify = value => asArray(value).map(item => {
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (!item || typeof item !== 'object') return text(item);
  return item;
});
const results = matching.map(([name, item]) => ({
  name, label: item?.label || item?.title || name,
  entry: simplify(getField(item, 'entry')), state: simplify(getField(item, 'state')),
  storage: simplify(getField(item, 'storage')), dom: simplify(getField(item, 'dom')),
  transitions: simplify(getField(item, 'transitions')), e2e: simplify(getField(item, 'e2e')),
  files: simplify(getField(item, 'files')), checks: simplify(getField(item, 'checks'))
}));
const result = { schemaVersion: 1, name: 'wake7-feature-investigation', status: 'passed', query: feature || { file }, registry: relative(root, registryPath), generatedAt: new Date().toISOString(), features: results };

if (json) console.log(JSON.stringify(result, null, 2));
else for (const item of results) {
  console.log(`機能調査: ${item.label} (${item.name})`);
  for (const [label, key] of [['主要入口', 'entry'], ['状態', 'state'], ['保存', 'storage'], ['DOM', 'dom'], ['次遷移', 'transitions'], ['E2E', 'e2e'], ['関連ファイル', 'files'], ['検査', 'checks']]) {
    console.log(`${label}: ${item[key].length ? item[key].map(text).join(', ') : 'なし'}`);
  }
}

const reportPath = join(root, 'build', 'report', 'feature-investigation.json');
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify(result, null, 2) + '\n');
