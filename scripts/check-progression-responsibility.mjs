// progression 責務レポートが、最新のシンボル索引から生成されているか確認する。
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const readJson = path => readFile(join(root, path), 'utf8').then(JSON.parse);
const [report, index] = await Promise.all([
  readJson('build/report/progression-responsibility.json'),
  readJson('build/report/symbol-index.json')
]);
const rankSource = await readFile(join(root, 'src/ui/rank.js'), 'utf8');
const definitions = Object.values(index.definitions || {});
const expected = definitions.filter(symbol => /(?:^|\/)(?:progression[^/]*|clear-flow|master-dialog|rank)\.(?:js|mjs)$/i.test(symbol.file || ''));
assert.equal(report.source, 'build/report/symbol-index.json');
assert.ok(report.generatedAt && report.summary && Array.isArray(report.entries), 'progression責務レポートの形式が不正です');
assert.equal(report.entries.length, expected.length, 'progression責務レポートが古いです。npm run trace:generate を実行してください');
assert.deepEqual(report.pipeline, ['entry', 'state-decision', 'transition', 'render'], '進行処理の追跡順が不正です');
assert.ok(report.summary.flowRoles && Number.isInteger(report.summary.mixedSymbols), '進行処理の流れ分類がありません');
assert.match(rankSource, /function openRankDialog\([\s\S]*renderRankList\(\)/, '称号ダイアログの入口から既存の描画入口へ接続されていません');
assert.deepEqual(Object.keys(report.summary.flowClassifications).sort(), ['orchestration', 'render', 'state-decision', 'transition'], '4分類の定義が不正です');
assert.ok(Array.isArray(report.fileSummary) && report.fileSummary.length > 0, 'ファイル責務サマリーがありません');
assert.ok(Array.isArray(report.mixedResponsibilitySymbols) && Array.isArray(report.unclassifiedSymbols), '複数責務・未分類一覧がありません');
assert.ok(Array.isArray(report.candidateClassifications) && report.summary.candidates, '責務候補の分類一覧がありません');
assert.equal(report.mixedResponsibilitySymbols.length, report.summary.mixedSymbols, '複数責務一覧と集計が一致しません');
assert.equal(report.unclassifiedSymbols.length, report.summary.unclassifiedSymbols, '未分類一覧と集計が一致しません');
const roles = new Set(['state', 'navigation', 'dialog', 'clear-flow', 'stage-picker', 'rank', 'render', 'unclassified']);
const flowRoles = new Set([...report.pipeline, 'unclassified']);
const candidateCategories = new Set(['duplicate', 'orchestrator', 'display-transition-mixed']);
for (const entry of report.entries) {
  assert.ok(entry.name && entry.file && Number.isInteger(entry.line), `責務エントリが不正です: ${entry.name}`);
  assert.ok(roles.has(entry.responsibility), `未知の責務です: ${entry.name}`);
  assert.ok(Array.isArray(entry.flowRoles) && entry.flowRoles.length > 0, `流れ分類がありません: ${entry.name}`);
  assert.ok(['state-decision', 'transition', 'render', 'orchestration'].includes(entry.flowClassification), `4分類がありません: ${entry.name}`);
  for (const role of entry.flowRoles) assert.ok(flowRoles.has(role), `未知の流れ分類です: ${entry.name} (${role})`);
  assert.equal(entry.mixedResponsibility, entry.flowRoles.length > 1, `複数責務フラグが不正です: ${entry.name}`);
}
for (const [classification, count] of Object.entries(report.summary.flowClassifications)) {
  assert.equal(report.entries.filter(entry => entry.flowClassification === classification).length, count, `4分類集計が不一致です: ${classification}`);
}
for (const candidate of report.candidateClassifications) {
  assert.ok(candidate.name && candidate.file && Number.isInteger(candidate.line), `責務候補が不正です: ${candidate.name}`);
  assert.ok(candidateCategories.has(candidate.category), `未知の責務候補分類です: ${candidate.name}`);
  assert.ok(Number.isInteger(candidate.priority) && candidate.priority >= 1 && candidate.priority <= 3, `責務候補の優先度が不正です: ${candidate.name}`);
  assert.ok(candidate.reason && candidate.evidence, `責務候補の判定理由がありません: ${candidate.name}`);
}
for (const [category, count] of Object.entries(report.summary.candidates)) {
  assert.equal(report.candidateClassifications.filter(candidate => candidate.category === category).length, count, `責務候補集計が不一致です: ${category}`);
}
const entryCount = report.entries.filter(entry => entry.flowRoles.includes('entry')).length;
assert.ok(entryCount > 0, '進行処理の入口が分類されていません');
console.log(`Progression responsibility report OK: ${report.entries.length} symbols across ${report.summary.files} files; pipeline entries=${entryCount}, mixed=${report.summary.mixedSymbols}.`);
