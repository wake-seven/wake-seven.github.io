import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishedSourceFiles } from './application-manifest.mjs';

// 共有状態の直接参照を数え、入口・所有者・個別移行候補に分類する。
// 自動置換は行わない。責務とE2Eを確認して安全な箇所だけを移行する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
const reportPath = join(reportDir, 'global-access.json');
const stateNames = ['activeMode','stageIndex','extraIndex','satoriIndex','activeLap','clearShown','tutorialStep','lastStageMode','currentInitialState','currentInitialPar','gameState'];
const gatewayFiles = new Set(['app/app-context.js']);
const ownerFiles = new Set(['runtime/runtime.js','runtime/progression-runtime.js','state/game-state.js']);
const sources = await Promise.all(publishedSourceFiles.map(async file => ({file,text:await readFile(join(root,'src',file),'utf8')})));
const entries=[];
for(const {file,text} of sources){
  for(const [index,line] of text.split('\n').entries()) for(const name of stateNames){
    const re=new RegExp(`\\b${name}\\b`,'g');
    for(const match of line.matchAll(re)){
      const before=line.slice(0,match.index);
      if(new RegExp(`(?:let|const|var|function)\\s+${name}\\b`).test(before))continue;
      const classification=gatewayFiles.has(file)?'gateway':ownerFiles.has(file)?'owner':'needs-migration';
      const after=line.slice(match.index+name.length);
      const beforeTrim=before.trimEnd();
      const isWrite=new RegExp(`(?:^|[\\s;,(])(?:[+\\-]{2})?${name}\\s*(?:[+\\-*/%]?=|[+\\-]{2})`).test(beforeTrim+' '+name+after)||/^(?:\+\+|--)/.test(after.trimStart());
      entries.push({name,file,line:index+1,access:isWrite?'write':'read',classification});
    }
  }
}
const counts=Object.fromEntries(['gateway','owner','needs-migration'].map(kind=>[kind,entries.filter(entry=>entry.classification===kind).length]));
const accessCounts=Object.fromEntries(['read','write'].map(kind=>[kind,entries.filter(entry=>entry.access===kind).length]));
let previous=null;
try{previous=JSON.parse(await readFile(reportPath,'utf8'));}catch{}
const previousCounts=previous?.counts||null;
const delta=previousCounts?Object.fromEntries(Object.keys(counts).map(kind=>[kind,counts[kind]-(previousCounts[kind]||0)])):null;
const report={generatedAt:new Date().toISOString(),source:'scripts/application-manifest.mjs:publishedSourceFiles',policy:{gateway:'明示的な共有状態入口を優先する',owner:'状態の所有者。直接参照を直ちに変更しない','needs-migration':'一括置換せず、責務とE2Eを確認して個別に移行する'},counts,accessCounts,delta,references:entries};
await mkdir(reportDir,{recursive:true});
await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(`Global access audit: ${entries.length} references (read ${accessCounts.read}, write ${accessCounts.write}; gateway ${counts.gateway}, owner ${counts.owner}, needs-migration ${counts['needs-migration']}).`);
if(delta)console.log(`Since previous report: gateway ${delta.gateway>=0?'+':''}${delta.gateway}, owner ${delta.owner>=0?'+':''}${delta.owner}, needs-migration ${delta['needs-migration']>=0?'+':''}${delta['needs-migration']}.`);
console.log(`Report: ${relative(root,reportPath)}`);
