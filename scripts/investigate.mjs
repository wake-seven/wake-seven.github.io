import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, relative, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2); const json = args.includes('--json'); const fileIndex = args.indexOf('--file'); const file = fileIndex >= 0 ? args[fileIndex + 1] : null; const feature = args.find((arg, index) => !arg.startsWith('-') && !(fileIndex >= 0 && index === fileIndex + 1));
if (!feature && !file) { console.log('使い方: npm run investigate -- <feature> または npm run investigate -- --file <path>'); process.exitCode = 1; process.exit(); }
const candidates = [join(root, 'scripts/feature-registry.json'), join(root, 'feature-registry.json'), join(root, 'docs/feature-registry.json')];
const registryPath = (await Promise.all(candidates.map(async path => ({ path, found: await access(path, constants.F_OK).then(() => true, () => false) })))).find(item => item.found)?.path;
if (!registryPath) { console.error('feature-registry.json が未整備です。'); process.exitCode = 1; process.exit(); }
const registry = JSON.parse(await readFile(registryPath, 'utf8')); const rawEntries = registry.features || registry.feature || registry.items || registry; const entries = Array.isArray(rawEntries) ? rawEntries.map((item, index) => [item?.name || item?.id || String(index), item]) : Object.entries(rawEntries || {});
const files = file ? [normalize(file).replaceAll('\\', '/')] : []; const requested = file?.toLowerCase().replaceAll('\\', '/');
const matchesFile = (item, path) => (item.paths || item.files || []).some(value => String(value?.path || value?.file || value).replaceAll('\\', '/').toLowerCase() === path || String(value?.path || value?.file || value).replaceAll('\\', '/').toLowerCase().endsWith(`/${path}`));
const matching = entries.filter(([name, item]) => (feature && name.toLowerCase() === feature.toLowerCase()) || (requested && matchesFile(item, requested)));
if (!matching.length) { console.error(`調査対象が feature-registry.json に見つかりません: ${feature || file}`); process.exitCode = 1; process.exit(); }
const array = value => value == null ? [] : Array.isArray(value) ? value : [value]; const simplify = value => array(value).map(item => typeof item === 'object' ? item : String(item));
const result = { schemaVersion: 1, name: 'wake7-feature-investigation', status: 'passed', query: feature || { file }, registry: relative(root, registryPath), generatedAt: new Date().toISOString(), features: matching.map(([name, item]) => ({ name, entry: simplify(item.entry), state: simplify(item.state), storage: simplify(item.storage), dom: simplify(item.dom), transitions: simplify(item.transitions || item.next), e2e: simplify(item.e2e || item.relatedE2E), files: simplify(item.files || item.paths), boundaries: simplify(item.boundaries), checks: simplify(item.checks) })) };
if (json) console.log(JSON.stringify(result, null, 2)); else for (const item of result.features) console.log(`機能調査: ${item.name}\n入口: ${item.entry.join(', ') || 'なし'}\n状態: ${item.state.join(', ') || 'なし'}\n保存: ${item.storage.join(', ') || 'なし'}\nDOM: ${item.dom.join(', ') || 'なし'}\n次の入口: ${item.transitions.join(', ') || 'なし'}\nE2E: ${item.e2e.join(', ') || 'なし'}\n境界: ${item.boundaries.join(', ') || 'なし'}\n検査: ${item.checks.join(', ') || 'なし'}\n関連ファイル: ${item.files.join(', ') || 'なし'}`);
const reportPath = join(root, 'build/report/feature-investigation.json'); await mkdir(dirname(reportPath), { recursive: true }); await writeFile(reportPath, JSON.stringify(result, null, 2) + '\n');
