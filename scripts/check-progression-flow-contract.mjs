import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(fileURLToPath(new URL('.',import.meta.url)),'..');
const report=JSON.parse(await readFile(join(root,'build/report/progression-flow-map.json'),'utf8'));
const required=['id','mode','from','event','entry','persist','cancel','to'];
const ids=new Set();
for(const entry of report.entries){
  for(const key of required)if(typeof entry[key]!=='string'||!entry[key])throw new Error(`進行フロー契約の${key}が不足: ${entry.id||'unknown'}`);
  if(ids.has(entry.id))throw new Error(`進行フロー契約IDが重複: ${entry.id}`);ids.add(entry.id);
}
for(const id of ['campaign-clear','campaign-next','speed-clear','rank-reward','reload-session','reload-clear','reload-speed'])if(!ids.has(id))throw new Error(`必須の進行フローが不足: ${id}`);
for(const id of ['campaign-clear','campaign-clear-dialog','campaign-next']){
  const entry=report.entries.find(candidate=>candidate.id===id);
  if(!entry?.owner||!entry?.guard)throw new Error(`クリア後フローの所有者/冪等ガードが不足: ${id}`);
}
const source=await readFile(join(root,'src/ui/progression-flow-contract.js'),'utf8');
if(!source.includes('getProgressionFlowContract'))throw new Error('実行時の進行フロー参照入口がありません');
// 契約に書いた入口が実装側から消えた場合は、レポートだけが残らないよう即時に検出する。
const implementationSources=await Promise.all([
  readFile(join(root,'src/runtime/runtime.js'),'utf8'),
  readFile(join(root,'src/ui/progression-clear-flow.js'),'utf8'),
  readFile(join(root,'src/ui/progression-ui.js'),'utf8'),
  readFile(join(root,'src/ui/board-ui.js'),'utf8'),
  readFile(join(root,'src/runtime/speed.js'),'utf8'),
  readFile(join(root,'src/runtime/app-bootstrap.js'),'utf8'),
  readFile(join(root,'src/runtime/app-events.js'),'utf8'),
  readFile(join(root,'src/commands/progression-commands.js'),'utf8')
]);
const implementation=implementationSources.join('\n');
const clearFlowImplementation=implementationSources[1];
const clearContracts={
  'campaign-clear':{owner:'progression-clear-flow',guard:'clearFlowCycle + phase idle',tokens:['clearFlowCycle','beginClearFlow','CLEAR_FLOW_PHASE.idle']},
  'campaign-clear-dialog':{owner:'progression-clear-flow',guard:'animationPending + dialogSequence consume once',tokens:['CLEAR_FLOW_PHASE.animationPending','enqueueClearFlowDialog','consumeClearFlowDialog']},
  'campaign-next':{owner:'progression-clear-flow',guard:'dialog/content phase + route resolved once',tokens:['CLEAR_FLOW_PHASE.dialog','CLEAR_FLOW_PHASE.content','resolveAfterClearRoute']}
};
for(const [id,expected] of Object.entries(clearContracts)){
  const entry=report.entries.find(candidate=>candidate.id===id);
  if(entry.owner!==expected.owner||entry.guard!==expected.guard)throw new Error(`クリア後フローのowner/guardが契約値と不一致: ${id}`);
  for(const token of expected.tokens)if(!clearFlowImplementation.includes(token))throw new Error(`クリア後フローのguard実装が不足: ${id} -> ${token}`);
}
for(const entry of report.entries){
  const entrySteps=entry.entry.split('→').map(step=>step.split('|').map(name=>name.trim()).filter(Boolean)).filter(step=>step.length);
  for(const alternatives of entrySteps){
    if(!alternatives.some(name=>implementation.includes(name)))throw new Error(`進行フロー入口が実装にありません: ${entry.id} -> ${alternatives.join(' / ')}`);
  }
}
console.log(`Progression flow contract OK: ${report.entries.length} transitions`);
