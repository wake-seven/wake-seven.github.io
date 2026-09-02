// 統合候補レポートが、現在の参照グラフから生成されたものか確認する。
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const report = JSON.parse(await readFile(join(root, 'build/report/refactor-candidates.json'), 'utf8'));
for (const file of report.source) await readFile(join(root, file), 'utf8');
assert.ok(report.generatedAt && report.summary && Array.isArray(report.candidates), '統合候補レポートの形式が不正です');
assert.equal(report.note, '候補は計測結果であり、自動削除・自動統合の指示ではない。');
const validRoles = new Set(['起動・共有コンテキスト', '状態変更の入口', '出題・文言データ', '盤面・進行ルール', 'ブラウザAPI・時間・保存・音', '状態と永続化', 'DOM描画・入力・ダイアログ', '未分類']);
const reportTime = Date.parse(report.generatedAt);
assert.ok(Number.isFinite(reportTime), '統合候補レポートの生成日時が不正です');
for (const candidate of report.candidates) {
  assert.ok(candidate.file && validRoles.has(candidate.role), `候補の分類が不正です: ${candidate.file}`);
  assert.ok(['thin-wrapper-or-boundary', 'small-module'].includes(candidate.classification), `候補の種別が不正です: ${candidate.file}`);
  assert.ok(['verify-manifest-before-removal', 'review-for-integration'].includes(candidate.action), `候補の対応方針が不正です: ${candidate.file}`);
  const sourceStat = await stat(join(root, 'src', candidate.file));
  assert.ok(sourceStat.mtimeMs <= reportTime + 2000, `統合候補レポートが古いです。npm run trace:generate を実行してください: ${candidate.file}`);
}
console.log(`Refactor candidate report OK: ${report.summary.candidates} candidates from ${report.summary.files} files.`);
