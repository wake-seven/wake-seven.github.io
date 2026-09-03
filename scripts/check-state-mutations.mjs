import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishedSourceFiles } from './application-manifest.mjs';

// 状態変数の直接書き換えを棚卸しする。状態所有モジュール以外では
// 直接代入を禁止し、コマンド／ゲートウェイ経由への移行を毎回検査する。
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const names=['activeMode','activeLap','stageIndex','extraIndex','satoriIndex','tutorialStep','clearShown','nextStageAttention','speedSession','speedVariant'];
const assignment=new RegExp('(?<![.$\\w])\\b('+names.join('|')+')\\s*(?<![=!<>])=(?!=)','g');
const entries=[];
for(const relative of publishedSourceFiles){
  const source=await readFile(join(root,'src',relative),'utf8');
  for(const match of source.matchAll(assignment)){
    // 表示モデルの引数デフォルトは共有状態の代入ではない。
    if(relative==='ui/progression-render.js'&&source.slice(0,match.index).split('\n').length===11)continue;
    const line=source.slice(0,match.index).split('\n').length;
    entries.push({file:relative,line,name:match[1],snippet:source.split('\n')[line-1].trim().slice(0,180)});
  }
}
const commandFile='commands/state-commands.js';
const commandSource=await readFile(join(root,'src',commandFile),'utf8');
for(const name of ['updateNavigationStateCommand','updateDialogStateCommand','updateSessionStateCommand','restoreNavigationStateCommand']){
  if(!commandSource.includes(`function ${name}(`))throw new Error(`Missing state command: ${name}`);
}
const ownerFiles=new Set(['app/app-context.js','runtime/runtime.js','runtime/speed.js','commands/speed-commands.js','commands/tutorial-commands.js']);
const violations=entries.filter(entry=>!ownerFiles.has(entry.file));
if(violations.length)throw new Error(`Direct state assignments outside owner modules: ${violations.map(entry=>`${entry.file}:${entry.line}:${entry.name}`).join(', ')}`);
for(const [file,name] of [['ui/board-ui.js','nextStageAttention'],['runtime/app-events.js','activeLap']]){
  if(entries.some(entry=>entry.file===file&&entry.name===name))throw new Error(`Migrated state still has a direct assignment: ${file}:${name}`);
}
const migrated=entries.filter(entry=>entry.file==='commands/state-commands.js').length;
const report={schemaVersion:2,generatedAt:new Date().toISOString(),source:'scripts/application-manifest.mjs:publishedSourceFiles',trackedNames:names,commandFile,ownerFiles:[...ownerFiles],counts:{directAssignments:entries.length,commandAssignments:migrated,violations:violations.length},migration:{migratedOutsideOwner:[{state:'nextStageAttention',from:'ui/board-ui.js',to:'updateDialogStateOwner'},{state:'activeLap',from:'runtime/app-events.js',to:'updateNavigationStateCommand'}],remainingDirectAssignments:'状態所有者内の初期化・同期、およびチュートリアル／速解きの所有コマンド内だけを許可',relatedE2E:['browser-e2e','device-e2e','progression-flows','clear-flow-order']},remaining:entries};
const output=join(root,'build','report','state-mutation-audit.json');
await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(`State mutation audit OK: ${entries.length} direct assignments tracked; state command entry present.`);
