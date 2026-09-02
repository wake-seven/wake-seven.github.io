// 統合候補レポートが、現在の参照グラフから生成されたものか確認する。
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const report = JSON.parse(await readFile(join(root, 'build/report/refactor-candidates.json'), 'utf8'));
for (const file of report.source) await readFile(join(root, file), 'utf8');
assert.ok(report.generatedAt && report.summary && Array.isArray(report.candidates), '統合候補レポートの形式が不正です');
assert.equal(report.note, '候補は計測結果であり、自動削除・自動統合の指示ではない。');
console.log(`Refactor candidate report OK: ${report.summary.candidates} candidates from ${report.summary.files} files.`);
