import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishedSourceFiles } from './application-manifest.mjs';
import { NAVIGATION_NAMES, DIALOG_NAMES, STATE_OWNER_FILES, POLICY_PATH } from './state-access-policy.mjs';

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
  await (await import('node:fs/promises')).writeFile(join(root,POLICY_PATH),JSON.stringify({schemaVersion:1,ownerFiles:[...STATE_OWNER_FILES],baselineTracked:tracked.length,allowedReferences:tracked.map(ref=>`${ref.file}:${ref.name}:${ref.source}`)},null,2)+'\n');
  console.log(`Refreshed ${POLICY_PATH} with ${tracked.length} existing exceptions.`);
  process.exit(0);
}
const allowed=new Set(policy.allowedReferences||[]);
const baselineCount=Number.isInteger(policy.baselineTracked)?policy.baselineTracked:allowed.size;
const fingerprint=ref=>`${ref.file}:${ref.name}:${ref.source}`;
const newRefs=tracked.filter(ref=>!allowed.has(fingerprint(ref)));
const missing=([...allowed]).filter(key=>!tracked.some(ref=>fingerprint(ref)===key));
assert.equal(newRefs.length,0,`New navigation/dialog direct references: ${newRefs.map(ref=>`${ref.file}:${ref.line}:${ref.name}`).join(', ')}`);
assert.ok(tracked.length<=baselineCount,`State access exception budget exceeded: baseline ${baselineCount}, current ${tracked.length}`);
const report={schemaVersion:1,generatedAt:new Date().toISOString(),names:[...names],ownerFiles:[...STATE_OWNER_FILES],baselineTracked:baselineCount,counts:{tracked:tracked.length,allowed:tracked.filter(ref=>allowed.has(fingerprint(ref))).length,newReferences:newRefs.length,retiredExceptions:missing.length,delta:tracked.length-baselineCount},newReferences:newRefs,retiredExceptions:missing};
const reportPath=join(root,'build','report','state-access-policy.json');
await mkdir(dirname(reportPath),{recursive:true});
await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(`State access policy OK: ${tracked.length} tracked references; ${missing.length} retired exceptions.`);
console.log(`Report: ${relative(root,reportPath)}`);
