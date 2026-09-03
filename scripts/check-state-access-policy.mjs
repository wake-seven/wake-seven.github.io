import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishedSourceFiles } from './application-manifest.mjs';
import { NAVIGATION_NAMES, DIALOG_NAMES, STATE_OWNER_FILES, POLICY_PATH, STATE_EXCEPTION_PURPOSES, classifyStateException, relatedTestsForStateException } from './state-access-policy.mjs';

// navigation/dialog状態は所有者の外で新しい直接参照を増やさない。
// 移行途中の既存参照だけを指紋で許可し、行番号変更には依存しない。
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const policy=JSON.parse(await readFile(join(root,POLICY_PATH),'utf8'));
assert.equal(policy.schemaVersion,1,'state access policy schemaVersion is invalid');
assert.deepEqual(policy.ownerFiles,[...STATE_OWNER_FILES],'state access owner list drifted');
const names=new Set([...NAVIGATION_NAMES,...DIALOG_NAMES]);
const refs=[];
for(const file of publishedSourceFiles){
  const text=await readFile(join(root,'src',file),'utf8');
  const lines=text.split('\n');
  for(let index=0;index<lines.length;index++){
    const line=lines[index];
    for(const name of names){
      const re=new RegExp(`\\b${name}\\b`,'g');
      for(const match of line.matchAll(re)){
        const before=line.slice(0,match.index);
        if(new RegExp(`(?:let|const|var|function)\\s+${name}\\b`).test(before))continue;
        // オブジェクトのキーやプロパティ名は共有状態の直接参照ではない。
        if(/^\s*:\s*/.test(line.slice(match.index+name.length))||/\.\s*$/.test(before))continue;
        refs.push({file,name,line:index+1,source:line.trim().replace(/\s+/g,' ').slice(0,220)});
      }
    }
  }
}
const tracked=refs.filter(ref=>!STATE_OWNER_FILES.includes(ref.file)&&ref.file!=='app/app-context.js');
if(process.argv.includes('--refresh')){
  const expiresOn='2026-12-02';
  const temporaryExceptions=tracked.map(ref=>{const meta=classifyStateException(ref);return {fingerprint:`${ref.file}:${ref.name}:${ref.source}`,expiresOn,owner:ref.file,migrationTarget:meta.migrationTarget,priority:meta.priority,relatedTests:relatedTestsForStateException(meta),reason:`${meta.purpose}状態の移行完了まで保持する既存参照`};});
  await (await import('node:fs/promises')).writeFile(join(root,POLICY_PATH),JSON.stringify({schemaVersion:1,ownerFiles:[...STATE_OWNER_FILES],baselineTracked:tracked.length,allowedReferences:tracked.map(ref=>`${ref.file}:${ref.name}:${ref.source}`),temporaryExceptions},null,2)+'\n');
  console.log(`Refreshed ${POLICY_PATH} with ${tracked.length} existing exceptions.`);
  process.exit(0);
}
const allowed=new Set(policy.allowedReferences||[]);
const baselineCount=Number.isInteger(policy.baselineTracked)?policy.baselineTracked:allowed.size;
const fingerprint=ref=>`${ref.file}:${ref.name}:${ref.source}`;
const newRefs=tracked.filter(ref=>!allowed.has(fingerprint(ref)));
const missing=([...allowed]).filter(key=>!tracked.some(ref=>fingerprint(ref)===key));
const fingerprintParts=value=>{
  const match=/^(.*?):([^:]+):(.*)$/.exec(value);
  return match?{file:match[1],name:match[2],source:match[3]}:null;
};
const fingerprintChanges=newRefs.flatMap(ref=>{
  const oldKey=[...allowed].find(key=>{
    const old=fingerprintParts(key);
    return old&&old.file===ref.file&&old.name===ref.name;
  });
  return oldKey?[{old:oldKey,new:fingerprint(ref)}]:[];
});
assert.equal(fingerprintChanges.length,0,`状態参照の指紋変更を検出しました。旧参照を削除して新参照を追加する場合は、移行理由とE2Eを確認してください: ${fingerprintChanges.map(change=>`${change.old} -> ${change.new}`).join(', ')}`);
assert.equal(newRefs.length,0,`新しい状態直接参照を検出しました: ${newRefs.map(ref=>`${ref.file}:${ref.line}:${ref.name}`).join(', ')}`);
assert.equal(missing.length,0,`状態直接参照の削除を検出しました。許可リストからも削除してください: ${missing.join(', ')}`);
assert.ok(tracked.length<=baselineCount,`State access exception budget exceeded: baseline ${baselineCount}, current ${tracked.length}`);
const exceptionMetadata=tracked.map(ref=>({fingerprint:fingerprint(ref),...classifyStateException(ref)}));
assert.equal(exceptionMetadata.length,tracked.length,'State access exception metadata is incomplete.');
for(const meta of exceptionMetadata){
  assert.ok(STATE_EXCEPTION_PURPOSES.includes(meta.purpose),`Unknown state exception purpose: ${meta.purpose}`);
  assert.equal(typeof meta.ownerOnly,'boolean',`ownerOnly is missing: ${meta.fingerprint}`);
  assert.equal(typeof meta.temporary,'boolean',`temporary is missing: ${meta.fingerprint}`);
  assert.ok(Number.isInteger(meta.priority)&&meta.priority>=1&&meta.priority<=3,`priority is invalid: ${meta.fingerprint}`);
  assert.ok(typeof meta.reason==='string'&&meta.reason.length>0,`reason is missing: ${meta.fingerprint}`);
}
const temporaryMetadata=new Map((policy.temporaryExceptions||[]).map(item=>[item.fingerprint,item]));
const missingTemporary=tracked.filter(ref=>{const item=exceptionMetadata.find(meta=>meta.fingerprint===fingerprint(ref));return item?.temporary&&!temporaryMetadata.has(fingerprint(ref));});
const expiredTemporary=tracked.filter(ref=>{const item=exceptionMetadata.find(meta=>meta.fingerprint===fingerprint(ref));const expiry=temporaryMetadata.get(fingerprint(ref));return item?.temporary&&(!expiry?.expiresOn||Date.parse(`${expiry.expiresOn}T23:59:59+09:00`)<Date.now());});
assert.equal(missingTemporary.length,0,`temporary例外に期限メタデータがありません: ${missingTemporary.map(ref=>fingerprint(ref)).join(', ')}`);
assert.equal(expiredTemporary.length,0,`temporary例外の期限が切れています: ${expiredTemporary.map(ref=>fingerprint(ref)).join(', ')}`);
const invalidTemporary=[...temporaryMetadata.values()].filter(item=>!item.expiresOn||!item.owner||!item.reason||!item.migrationTarget||!Number.isInteger(item.priority)||!Array.isArray(item.relatedTests)||!item.relatedTests.length);
assert.equal(invalidTemporary.length,0,`temporary例外の必須メタデータが不足しています: ${invalidTemporary.map(item=>item.fingerprint).join(', ')}`);
const unknownTemporary=[...temporaryMetadata.keys()].filter(key=>!tracked.some(ref=>fingerprint(ref)===key));
assert.equal(unknownTemporary.length,0,`追跡対象にないtemporary例外があります: ${unknownTemporary.join(', ')}`);
const countsByPurpose=Object.fromEntries(STATE_EXCEPTION_PURPOSES.map(purpose=>[purpose,exceptionMetadata.filter(meta=>meta.purpose===purpose).length]));
const accessOf=ref=>new RegExp(`(?:^|[\\s;,(])(?:[+\\-]{2})?${ref.name}\\s*(?:[+\\-*/%]?=|[+\\-]{2})`).test(ref.source+' '+ref.name)||/^(?:\+\+|--)/.test(ref.source)?'write':'read';
const entrypointOf=ref=>ref.file.startsWith('commands/')?'commands':ref.file.startsWith('runtime/')?'runtime':ref.file.startsWith('ui/')?'ui':ref.file.startsWith('data/')?'data':'other';
const baselineEntries=tracked.map(ref=>{
  const meta=exceptionMetadata.find(item=>item.fingerprint===fingerprint(ref));
  return {fingerprint:fingerprint(ref),source:{file:ref.file,line:ref.line,excerpt:ref.source},symbol:ref.name,entrypoint:entrypointOf(ref),access:accessOf(ref),purpose:meta.purpose,ownerOnly:meta.ownerOnly,temporary:meta.temporary,migrationTarget:meta.migrationTarget,priority:meta.priority,reason:meta.reason,relatedE2E:relatedTestsForStateException(meta)};
});
const countsByEntrypoint=Object.fromEntries([...new Set(baselineEntries.map(entry=>entry.entrypoint))].sort().map(key=>[key,baselineEntries.filter(entry=>entry.entrypoint===key).length]));
const countsByAccess={read:baselineEntries.filter(entry=>entry.access==='read').length,write:baselineEntries.filter(entry=>entry.access==='write').length};
const report={schemaVersion:1,generatedAt:new Date().toISOString(),names:[...names],ownerFiles:[...STATE_OWNER_FILES],baselineTracked:baselineCount,counts:{tracked:tracked.length,allowed:tracked.filter(ref=>allowed.has(fingerprint(ref))).length,newReferences:newRefs.length,retiredExceptions:missing.length,temporary:exceptionMetadata.filter(meta=>meta.temporary).length,expiredTemporary:expiredTemporary.length},countsByPurpose,countsByEntrypoint,countsByAccess,exceptionMetadata,temporaryExceptions:[...temporaryMetadata.values()],baselineEntries,newReferences:newRefs,retiredExceptions:missing};
const reportPath=join(root,'build','report','state-access-policy.json');
await mkdir(dirname(reportPath),{recursive:true});
await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
const baselinePath=join(root,'build','report','state-access-baseline.json');
let previousBaseline=null;try{previousBaseline=JSON.parse(await readFile(baselinePath,'utf8'));}catch{}
const previousFingerprints=new Set((previousBaseline?.entries||[]).map(entry=>entry.fingerprint));
const currentFingerprints=new Set(baselineEntries.map(entry=>entry.fingerprint));
const added=[...currentFingerprints].filter(key=>!previousFingerprints.has(key));
const removed=[...previousFingerprints].filter(key=>!currentFingerprints.has(key));
const diff={schemaVersion:1,name:'state-access-diff',generatedAt:report.generatedAt,previousGeneratedAt:previousBaseline?.generatedAt||null,counts:{previous:previousFingerprints.size,current:currentFingerprints.size,added:added.length,removed:removed.length,fingerprintChanges:fingerprintChanges.length},added,removed,fingerprintChanges};
await writeFile(join(root,'build','report','state-access-diff.json'),JSON.stringify(diff,null,2)+'\n');
await writeFile(baselinePath,JSON.stringify({schemaVersion:1,name:'state-access-baseline',generatedAt:report.generatedAt,source:'scripts/state-access-exceptions.json',counts:{temporary:baselineEntries.filter(entry=>entry.temporary).length,byPurpose:countsByPurpose,byEntrypoint:countsByEntrypoint,byAccess:countsByAccess},entries:baselineEntries},null,2)+'\n');
console.log(`State access policy OK: ${tracked.length} tracked references; ${missing.length} retired exceptions.`);
console.log(`State access baseline: ${baselineEntries.length} entries; temporary ${baselineEntries.filter(entry=>entry.temporary).length}; report build/report/state-access-baseline.json`);
console.log(`Report: ${relative(root,reportPath)}`);
