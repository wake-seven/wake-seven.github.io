import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { investigateFeatures, formatInvestigation, loadFeatureRegistry } from './lib/feature-investigation.mjs';
import { CHANGE_SESSION_PHASES } from './lib/change-session.mjs';

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
const requiredChecks = [...new Set(investigation.features.flatMap(item => item.checks || []))];
const relatedE2E = [...new Set(investigation.features.flatMap(item => item.e2e || []))];
const startedAt = new Date().toISOString();
const session = {
  schemaVersion: 2,
  name: 'wake7-change-session',
  feature,
  phase: CHANGE_SESSION_PHASES.editing,
  startedAt,
  baseRevision,
  initialChangedFiles,
  requiredVerification: {
    editing: { profile: 'fast', checks: requiredChecks },
    milestone: { profile: 'affected', checks: requiredChecks, e2e: relatedE2E.filter(name => name !== 'device-e2e') },
    release: { profile: 'full', checks: ['check:gate', ...requiredChecks], e2e: relatedE2E }
  },
  phaseHistory: [{ phase: CHANGE_SESSION_PHASES.editing, command: 'change:start', completedAt: startedAt }],
  investigation
};
await mkdir(join(root, 'tmp'), { recursive: true });
await writeFile(join(root, 'tmp/change-session.json'), JSON.stringify(session, null, 2) + '\n');
console.log(formatInvestigation(investigation));
console.log(`改修セッションを開始しました: ${feature}`);
console.log(`現在フェーズ: ${session.phase}`);
console.log(`milestone必須検査: ${requiredChecks.join(', ') || 'feature固有なし'}`);
console.log(`関連E2E: ${relatedE2E.join(', ') || 'feature固有なし'}`);
console.log('次の検査はこのセッションの影響調査を前提に実行されます。');
