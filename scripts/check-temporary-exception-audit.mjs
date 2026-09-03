import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// temporary例外を一つの監査結果へ集約する。残件がある間は「完了」にせず、
// 期限・所有者・次の移行単位を残すことで、例外の存在を成功と取り違えない。
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const policy=JSON.parse(await readFile(join(root,'scripts/state-access-exceptions.json'),'utf8'));
const source=JSON.parse(await readFile(join(root,'build/report/state-access-policy.json'),'utf8'));
const evidenceNames=['state-classification','state-mutation-audit','progression-responsibility','clear-flow-order','browser-e2e-result','device-e2e-result'];
const evidence={};
for(const name of evidenceNames)evidence[name]=JSON.parse(await readFile(join(root,'build/report',`${name}.json`),'utf8'));
const temporary=(source.baselineEntries||[]).filter(entry=>entry.temporary);
const metadata=new Map((policy.temporaryExceptions||[]).map(item=>[item.fingerprint,item]));
assert.ok(metadata.size<=temporary.length,'temporary例外のメタデータ件数が不正です');
const by=(items,key)=>Object.fromEntries([...new Set(items.map(item=>item[key]||'unknown'))].sort().map(value=>[value,items.filter(item=>(item[key]||'unknown')===value).length]));
const priority=Object.fromEntries([1,2,3].map(value=>[String(value),temporary.filter(item=>item.priority===value).length]));
const remaining=temporary.map(entry=>{
  const item=metadata.get(entry.fingerprint);assert.ok(item,`temporary例外のメタデータがありません: ${entry.fingerprint}`);
  assert.ok(item.expiresOn&&Date.parse(`${item.expiresOn}T23:59:59+09:00`)>Date.now(),`temporary例外の期限が不正です: ${entry.fingerprint}`);
  return {fingerprint:entry.fingerprint,source:entry.source,symbol:entry.symbol,purpose:entry.purpose,entrypoint:entry.entrypoint,priority:entry.priority,owner:'runtime/runtime.js / app/app-context.js（共有状態所有者）',expiresOn:item.expiresOn,nextMigrationUnit:entry.migrationTarget||`gateway:${entry.purpose}`,reason:item.reason};
});
const allEntries=source.baselineEntries||[];
const classification=by(allEntries,'exceptionClass');
classification['owner-only']=source.ownerFiles?.length||0;
const completion=remaining.length===0?'complete':'in-progress';
if(remaining.length>0)assert.notEqual(completion,'complete','temporary例外が残っているため監査を完了扱いにできません');
else assert.equal(completion,'complete','temporary例外0件の状態が不正です');
const generatedAt=new Date().toISOString();
const report={schemaVersion:2,name:'wake7-state-access-final-audit',generatedAt,status:remaining.length===0?'passed':'warning',completion,summary:{temporaryCount:remaining.length,temporaryZero:remaining.length===0,progress:`${remaining.length===0?0:policy.baselineTracked-remaining.length}/${policy.baselineTracked}`,byClassification:classification,byPurpose:by(allEntries,'purpose'),byEntrypoint:by(allEntries,'entrypoint'),byPriority:Object.fromEntries([1,2,3].map(value=>[String(value),allEntries.filter(item=>item.priority===value).length])),ownerFiles:source.ownerFiles||[]},remaining,evidence:evidenceNames.map(name=>({name,file:`build/report/${name}.json`,passed:evidence[name].passed??null,status:evidence[name].status||null,consoleErrors:evidence[name].consoleErrors||[]})),warnings:remaining.length?['temporary例外が残っているため移行継続中です']:[],errors:[]};
const path=join(root,'build/report/temporary-exception-audit.json');await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(report,null,2)+'\n');
await writeFile(join(root,'build/report/state-access-final-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Temporary exception audit: ${remaining.length} remaining (${completion}). Report: ${relative(root,path)}`);
