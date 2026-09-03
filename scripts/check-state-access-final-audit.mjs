import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 最終監査レポートが、例外の分類と検証証跡を欠かさず集約していることを確認する。
// temporary が残っている間は warning/in-progress を許可するが、complete は0件だけとする。
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const report=JSON.parse(await readFile(join(root,'build/report/state-access-final-audit.json'),'utf8'));
assert.equal(report.schemaVersion,2,'state access final audit schemaVersion is invalid');
assert.ok(report.summary?.byClassification,'分類別集計がありません');
for(const key of ['temporary','intentional-exception','owner-only'])assert.ok(Object.hasOwn(report.summary.byClassification,key),`分類別集計が不足しています: ${key}`);
assert.equal(report.summary.temporaryZero,report.summary.temporaryCount===0,'temporaryゼロ判定が件数と一致しません');
assert.equal(report.completion,report.summary.temporaryZero?'complete':'in-progress','temporary完了条件が不正です');
assert.equal(report.summary.temporaryZero,report.status==='passed','temporary完了状態と監査statusが不一致です');
assert.ok(Array.isArray(report.evidence)&&report.evidence.length>=6,'最終検証証跡が不足しています');
for(const evidence of report.evidence){
  const source=evidence.name==='state-classification'?JSON.parse(await readFile(join(root,'build/report/state-classification.json'),'utf8')):
    evidence.name==='progression-responsibility'?JSON.parse(await readFile(join(root,'build/report/progression-responsibility.json'),'utf8')):
    evidence.name==='state-mutation-audit'?JSON.parse(await readFile(join(root,'build/report/state-mutation-audit.json'),'utf8')):null;
  const passed=evidence.passed===true||evidence.status==='passed'||
    (evidence.name==='state-classification'&&source.missing.length===0&&source.overlaps.length===0)||
    (evidence.name==='progression-responsibility'&&source.unclassifiedSymbols.length===0)||
    (evidence.name==='state-mutation-audit'&&source.counts.violations===0);
  assert.ok(passed,`検証未通過: ${evidence.name}`);
  assert.deepEqual(evidence.consoleErrors||[],[],`コンソールエラー: ${evidence.name}`);
}
console.log(`State access final audit OK: ${report.summary.temporaryCount} temporary exceptions (${report.completion}); ${report.evidence.length} evidence reports.`);
