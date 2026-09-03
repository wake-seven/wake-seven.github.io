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
const definitions = Object.values(index.definitions || {});
const expected = definitions.filter(symbol => /(?:^|\/)(?:progression[^/]*|clear-flow|master-dialog|rank)\.(?:js|mjs)$/i.test(symbol.file || ''));
assert.equal(report.source, 'build/report/symbol-index.json');
assert.ok(report.generatedAt && report.summary && Array.isArray(report.entries), 'progression責務レポートの形式が不正です');
assert.equal(report.entries.length, expected.length, 'progression責務レポートが古いです。npm run trace:generate を実行してください');
assert.deepEqual(report.pipeline, ['entry', 'state-decision', 'transition', 'render'], '進行処理の追跡順が不正です');
assert.ok(report.summary.flowRoles && Number.isInteger(report.summary.mixedSymbols), '進行処理の流れ分類がありません');
assert.ok(Array.isArray(report.fileSummary) && report.fileSummary.length > 0, 'ファイル責務サマリーがありません');
const roles = new Set(['state', 'navigation', 'dialog', 'clear-flow', 'stage-picker', 'rank', 'render', 'unclassified']);
const flowRoles = new Set([...report.pipeline, 'unclassified']);
for (const entry of report.entries) {
  assert.ok(entry.name && entry.file && Number.isInteger(entry.line), `責務エントリが不正です: ${entry.name}`);
  assert.ok(roles.has(entry.responsibility), `未知の責務です: ${entry.name}`);
  assert.ok(Array.isArray(entry.flowRoles) && entry.flowRoles.length > 0, `流れ分類がありません: ${entry.name}`);
  for (const role of entry.flowRoles) assert.ok(flowRoles.has(role), `未知の流れ分類です: ${entry.name} (${role})`);
  assert.equal(entry.mixedResponsibility, entry.flowRoles.length > 1, `複数責務フラグが不正です: ${entry.name}`);
}
const entryCount = report.entries.filter(entry => entry.flowRoles.includes('entry')).length;
assert.ok(entryCount > 0, '進行処理の入口が分類されていません');
console.log(`Progression responsibility report OK: ${report.entries.length} symbols across ${report.summary.files} files; pipeline entries=${entryCount}, mixed=${report.summary.mixedSymbols}.`);
