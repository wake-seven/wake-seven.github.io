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
const roles = new Set(['state', 'navigation', 'dialog', 'clear-flow', 'stage-picker', 'rank', 'render', 'unclassified']);
for (const entry of report.entries) {
  assert.ok(entry.name && entry.file && Number.isInteger(entry.line), `責務エントリが不正です: ${entry.name}`);
  assert.ok(roles.has(entry.responsibility), `未知の責務です: ${entry.name}`);
}
console.log(`Progression responsibility report OK: ${report.entries.length} symbols across ${report.summary.files} files.`);
