import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceRevision, writeReport } from './lib/report.mjs';

// 構造契約の前回基準との差分を、削減対象と増加許容対象に分けて記録する。
// 数値を自動修正せず、意図した増加は baseline 更新で明示的に採用する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
const readJson = async name => JSON.parse(await readFile(join(reportDir, name), 'utf8'));
const [baseline, current, responsibility] = await Promise.all([
  readJson('refactor-baseline.json'), readJson('current-refactor-baseline.json'), readJson('progression-responsibility.json')
]);
const before = baseline.contract || {};
const after = current.contract || {};
const metrics = [
  ['stateReferenceCount', '状態参照', 'decrease'],
  ['stateAssignmentCount', '状態代入', 'decrease'],
  ['responsibilityCandidateCount', '責務候補', 'decrease'],
  ['e2eCaseCount', 'E2E件数', 'increase'],
  ['progressionEntryCount', '進行入口数', 'stable'],
  ['entryPointCount', '入口数', 'stable']
];
const deltas = metrics.map(([key, label, direction]) => ({
  key, label, direction, baseline: before[key] ?? null, current: after[key] ?? null,
  delta: Number.isFinite(before[key]) && Number.isFinite(after[key]) ? after[key] - before[key] : null,
  available: Number.isFinite(before[key]) && Number.isFinite(after[key])
}));
const reportBefore = new Set(before.reportInventory || []);
const reportAfter = new Set(after.reportInventory || []);
const reportDiff = { added: [...reportAfter].filter(file => !reportBefore.has(file)), removed: [...reportBefore].filter(file => !reportAfter.has(file)) };
const warnings = [];
const errors = [];
for (const item of deltas) {
  if (!item.available) { warnings.push(`${item.label}: baseline/current に値がなく比較できません`); continue; }
  if (item.direction === 'decrease' && item.delta > 0) warnings.push(`${item.label}が増加しました: ${item.baseline} → ${item.current}`);
  if (item.direction === 'increase' && item.delta < 0) errors.push(`${item.label}が減少しました: ${item.baseline} → ${item.current}`);
  if (item.direction === 'stable' && item.delta !== 0) warnings.push(`${item.label}が変化しました: ${item.baseline} → ${item.current}`);
}
if (reportDiff.removed.length) warnings.push(`レポートが削除されました: ${reportDiff.removed.join(', ')}`);
const report = {
  schemaVersion: 1, name: 'wake7-structure-contract-diff', generatedAt: new Date().toISOString(),
  sourceRevision: await sourceRevision(root), status: errors.length ? 'failed' : warnings.length ? 'warning' : 'passed',
  summary: { metrics: deltas, reportDiff, responsibilityCandidates: responsibility.summary?.candidates || {} }, warnings, errors,
  policy: { warning: ['状態参照・責務候補の増加', '入口数の変化', 'レポート削除'], failure: ['E2E件数の減少'], baselineUpdate: '意図した構造変更後のみ npm run baseline:accept でレビュー済み基準へ更新する' },
  baseline: 'build/report/refactor-baseline.json', current: 'build/report/current-refactor-baseline.json'
};
await mkdir(reportDir, { recursive: true });
await writeReport(join(reportDir, 'structure-contract-diff.json'), report);
console.log(`Structure contract diff: ${warnings.length} warnings, ${errors.length} errors. Report: build/report/structure-contract-diff.json`);
if (errors.length) process.exitCode = 1;
