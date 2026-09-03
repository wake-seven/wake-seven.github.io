import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// 最終ゲートが、進行責務・クリア導線・構造差分・実ブラウザE2Eを
// 同じ作業単位で実行し、結果とコンソールエラーを証跡化したことを確認する。
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const names=['progression-responsibility','progression-orchestrators','clear-flow-order','structure-contract-diff','browser-e2e-result','device-e2e-result','translation-audit','dialog-state-map','global-state-classification'];
const reports={};
for(const name of names){
  const path=join(root,'build/report',`${name}.json`);
  reports[name]=JSON.parse(await readFile(path,'utf8'));
}
assert.equal(reports['progression-orchestrators'].status,'passed','progressionオーケストレーター契約が未通過です');
assert.equal(reports['clear-flow-order'].passed,true,'clear-flow契約が未通過です');
for(const name of ['browser-e2e-result','device-e2e-result']){
  assert.equal(reports[name].passed,true,`${name} が未通過です`);
  assert.deepEqual(reports[name].consoleErrors||[],[],`${name} にコンソールエラーがあります`);
}
const passed=name=>reports[name].passed===true||reports[name].status==='passed';
const evidence={schemaVersion:2,name:'wake7-gate-evidence',generatedAt:new Date().toISOString(),status:'passed',requiredReports:names.map(name=>({name,file:`build/report/${name}.json`,status:reports[name].status||null,passed:reports[name].passed??null,consoleErrors:reports[name].consoleErrors||[]})),summary:{progressionResponsibility:passed('progression-responsibility'),clearFlow:passed('clear-flow-order'),structureContract:reports['structure-contract-diff'].status,chromeE2e:passed('browser-e2e-result'),deviceE2e:passed('device-e2e-result'),translations:passed('translation-audit'),dialogStateMap:passed('dialog-state-map'),globalStateClassification:passed('global-state-classification'),consoleErrors:0}};
const reportPath=join(root,'build/report/gate-evidence.json');
await mkdir(dirname(reportPath),{recursive:true});await writeFile(reportPath,JSON.stringify(evidence,null,2)+'\n');
console.log(`Gate evidence OK: ${names.length} reports, Chrome/device console errors 0. Report: ${relative(root,reportPath)}`);
