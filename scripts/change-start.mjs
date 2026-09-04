import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { investigateFeatures, formatInvestigation, loadFeatureRegistry } from './lib/feature-investigation.mjs';

// 改修の最初に必ず実行する入口。影響調査を済ませたセッションを作り、
// 以後の affected 検査が「調査なし」で走らないようにする。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const requestedFeature = process.argv.slice(2).find(value => !value.startsWith('-'));
const { entries } = await loadFeatureRegistry(root);
const normalized = String(requestedFeature || '').toLowerCase();
const aliases = { 'speed-menu': 'runtime/speed', 'speed-run': 'runtime/speed', 'speed-mode': 'runtime/speed' };
const alias = aliases[normalized];
const ranked = requestedFeature ? entries.map(([name, item]) => {
  const haystack = [name, ...(item.paths || [])].join(' ').toLowerCase();
  const score = name.toLowerCase() === alias ? 120 : haystack === normalized ? 100 : name.toLowerCase() === normalized ? 90 : haystack.includes(normalized) ? 50 : 0;
  return { name, score };
}).filter(item => item.score > 0).sort((a, b) => b.score - a.score) : [];
const feature = ranked[0]?.name;
if (!feature) {
  console.error(`調査対象のfeatureが見つかりません: ${requestedFeature || '(未指定)'}`);
  console.error(`候補: ${entries.map(([name]) => name).join(', ')}`);
  console.error('使い方: npm run change:start -- <feature>');
  process.exit(1);
}
const raw = execFileSync('git', ['status', '--porcelain=v1', '-z'], { cwd: root, encoding: 'utf8' });
const initialChangedFiles = raw.split('\0').filter(Boolean).map(entry => entry.slice(3).replaceAll('\\', '/'))
  .filter(file => !file.startsWith('build/report/'));
const baseRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const investigation = await investigateFeatures({ root, feature });
const session = { schemaVersion: 1, name: 'wake7-change-session', feature,
  startedAt: new Date().toISOString(), baseRevision, initialChangedFiles, investigation };
await mkdir(join(root, 'tmp'), { recursive: true });
await writeFile(join(root, 'tmp/change-session.json'), JSON.stringify(session, null, 2) + '\n');
console.log(formatInvestigation(investigation));
console.log(`改修セッションを開始しました: ${feature}`);
console.log('次の検査はこのセッションの影響調査を前提に実行されます。');
