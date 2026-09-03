import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// navigation移行の完了条件と、同じゲートで確認した品質証跡を一つに集約する。
// temporaryが残る間は「成功」ではなく、明示的なin-progressとして扱う。
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const load=async name=>JSON.parse(await readFile(join(root,'build/report',`${name}.json`),'utf8'));
const navigation=await load('navigation-classification');
const state=await load('state-access-final-audit');
const evidence=await load('gate-evidence');
const progression=await load('progression-responsibility');
const clearFlow=await load('clear-flow-order');
const structure=await load('structure-contract-diff');
const browser=await load('browser-e2e-result');
const device=await load('device-e2e-result');

assert.equal(navigation.schemaVersion,2,'navigation分類レポートのschemaVersionが不正です');
assert.ok(navigation.summary&&Number.isInteger(navigation.summary.temporaryCount),'navigation temporary件数がありません');
assert.equal(navigation.summary.temporaryZero,navigation.summary.temporaryCount===0,'navigation temporaryゼロ判定が不正です');
assert.equal(state.completion,state.summary.temporaryZero?'complete':'in-progress','state移行完了状態が不正です');
assert.equal(progression.summary?.unclassifiedSymbols??0,0,'進行責務に未分類シンボルがあります');
assert.equal(clearFlow.passed,true,'clear-flow契約が未通過です');
assert.equal(structure.status,'passed','構造契約差分が未通過です');
for(const report of [browser,device]){
  assert.equal(report.passed,true,`${report.name} が未通過です`);
  assert.deepEqual(report.consoleErrors||[],[],`${report.name} にコンソールエラーがあります`);
}
const temporaryEntries=(navigation.entries||[]).filter(entry=>entry.temporary);
for(const entry of temporaryEntries){
  assert.ok(entry.owner&&entry.reason&&entry.nextMigrationUnit&&entry.expiresOn&&entry.relatedE2E?.length,`temporary navigationメタデータ不足: ${entry.file}:${entry.line}`);
}
const reports=[
  ['navigation-classification',navigation],['state-access-final-audit',state],
  ['progression-responsibility',progression],['clear-flow-order',clearFlow],
  ['structure-contract-diff',structure],['gate-evidence',evidence],
  ['browser-e2e-result',browser],['device-e2e-result',device]
];
const consoleErrors=reports.flatMap(([name,report])=>(report.consoleErrors||[]).map(error=>({report:name,error})));
const report={
  schemaVersion:1,name:'wake7-navigation-final-audit',generatedAt:new Date().toISOString(),
  status:navigation.summary.temporaryZero?'passed':'warning',
  completion:navigation.summary.temporaryZero?'complete':'in-progress',
  summary:{temporaryCount:navigation.summary.temporaryCount,temporaryZero:navigation.summary.temporaryZero,
    navigationReferences:navigation.summary.references,byCategory:navigation.summary.byCategory,
    browserE2E:browser.passed===true,deviceE2E:device.passed===true,consoleErrorCount:consoleErrors.length,
    progressionUnclassified:progression.summary?.unclassifiedSymbols??null,clearFlow:clearFlow.passed===true,
    structureContract:structure.status},
  migration:{owner:'runtime/runtime.js / app/app-context.js',nextMigrationUnit:'navigation context取得を入口で固定して判定へ渡す',
    policy:'temporaryゼロになるまで移行継続。期限切れ・理由欠落・新規候補はゲート失敗',
    remaining:temporaryEntries.map(entry=>({file:entry.file,line:entry.line,name:entry.name,reason:entry.reason,owner:entry.owner,nextMigrationUnit:entry.nextMigrationUnit,expiresOn:entry.expiresOn,relatedE2E:entry.relatedE2E}))},
  evidence:reports.map(([name,value])=>({name,file:`build/report/${name}.json`,status:value.status||null,passed:value.passed??null,consoleErrors:value.consoleErrors||[]})),
  consoleErrors,warnings:navigation.summary.temporaryZero?[]:['navigation gateway候補が残っているため移行継続中です'],errors:[]
};
await writeFile(join(root,'build/report/navigation-final-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Navigation final audit OK: ${temporaryEntries.length} temporary candidates (${report.completion}), ${consoleErrors.length} console errors.`);
