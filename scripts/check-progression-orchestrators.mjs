import { readFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeReport, sourceRevision } from './lib/report.mjs';

// 主要オーケストレーターが「状態判断→遷移→描画」の順を保つことを、
// 実装の挙動を変えずに関数本体の契約として検査する。
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const catalogSource=await readFile(join(root,'src/ui/progression-flow-contract.js'),'utf8');
const match=catalogSource.match(/const PROGRESSION_ORCHESTRATORS=Object\.freeze\((\[[\s\S]*?\])\);/);
if(!match)throw new Error('進行オーケストレーターの宣言が見つかりません');
const entries=Function(`"use strict";return (${match[1]});`)();
if(!Array.isArray(entries)||entries.length<4)throw new Error('進行オーケストレーターが不足しています');
const checks=[];
for(const entry of entries){
  const sourcePath=join(root,entry.source);
  const source=await readFile(sourcePath,'utf8');
  const start=source.indexOf(`function ${entry.entry}(`);
  if(start<0)throw new Error(`${entry.id}: ${entry.entry} の定義が見つかりません`);
  const next=source.indexOf('\nfunction ',start+1);
  // コメント中の関数名を実装順と誤認しないよう、検査対象からコメントを除く。
  const body=source.slice(start,next<0?source.length:next)
    .replace(/\/\/.*$/gm,'').replace(/\/\*[\s\S]*?\*\//g,'');
  let previous=-1;
  const phases={};
  for(const phase of ['decision','transition','render']){
    const tokens=entry.order?.[phase]||[];
    if(!tokens.length)throw new Error(`${entry.id}: ${phase} の契約が空です`);
    phases[phase]=tokens.map(token=>{
      const index=(entry.id==='dialog-restore'?source:body).indexOf(token);
      if(index<0)throw new Error(`${entry.id}: ${phase} の入口 ${token} が ${entry.entry} にありません`);
      if(index<previous)throw new Error(`${entry.id}: state decision→transition→render の順序が壊れています (${token})`);
      previous=index;return {token,index};
    });
  }
  checks.push({id:entry.id,name:entry.name,entry:entry.entry,source:entry.source,phases});
}
const report={schemaVersion:1,name:'wake7-progression-orchestrators',generatedAt:new Date().toISOString(),sourceRevision:await sourceRevision(root),status:'passed',summary:{orchestrators:checks.length,order:'decision→transition→render'},checks};
const reportPath=join(root,'build/report/progression-orchestrators.json');
await mkdir(dirname(reportPath),{recursive:true});await writeReport(reportPath,report);
console.log(`Progression orchestrator contract passed: ${checks.length} entries. Report: ${reportPath}`);
