import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishedSourceFiles } from './application-manifest.mjs';

// 状態変数の直接書き換えを棚卸しする。移行途中のため即時全廃はせず、
// コマンド入口へ移した件数と残存箇所を毎回同じ形式で記録する。
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const names=['activeMode','stageIndex','extraIndex','satoriIndex','tutorialStep','clearShown','speedSession','speedVariant'];
const assignment=new RegExp('\\b('+names.join('|')+')\\s*(?<![=!<>])=(?!=)','g');
const entries=[];
for(const relative of publishedSourceFiles){
  const source=await readFile(join(root,'src',relative),'utf8');
  for(const match of source.matchAll(assignment)){
    const line=source.slice(0,match.index).split('\n').length;
    entries.push({file:relative,line,name:match[1],snippet:source.split('\n')[line-1].trim().slice(0,180)});
  }
}
const commandFile='commands/state-commands.js';
const commandSource=await readFile(join(root,'src',commandFile),'utf8');
for(const name of ['updateNavigationStateCommand','updateDialogStateCommand','updateSessionStateCommand','restoreNavigationStateCommand']){
  if(!commandSource.includes(`function ${name}(`))throw new Error(`Missing state command: ${name}`);
}
const migrated=entries.filter(entry=>entry.file==='commands/state-commands.js').length;
const report={schemaVersion:1,generatedAt:new Date().toISOString(),source:'scripts/application-manifest.mjs:publishedSourceFiles',trackedNames:names,commandFile,counts:{directAssignments:entries.length,commandAssignments:migrated},remaining:entries};
const output=join(root,'build','report','state-mutation-audit.json');
await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(`State mutation audit OK: ${entries.length} direct assignments tracked; state command entry present.`);
