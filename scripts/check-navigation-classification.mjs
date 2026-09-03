import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishedSourceFiles } from './application-manifest.mjs';
import { NAVIGATION_NAMES, STATE_OWNER_FILES } from './state-access-policy.mjs';

// navigationの残件を、単なる件数ではなくコード証拠付きの移行判断へ分類する。
// pointer/アニメーション経路は無理にgateway化せず、読み取り専用の候補だけを次の単位にする。
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const files=new Map(await Promise.all(publishedSourceFiles.map(async file=>[file,(await readFile(join(root,'src',file),'utf8')).split('\n')])));
const access=JSON.parse(await readFile(join(root,'build/report/global-access.json'),'utf8'));
let previousReport=null;try{previousReport=JSON.parse(await readFile(join(root,'build/report/navigation-classification.json'),'utf8'));}catch{}
let stateAccessReport=null;try{stateAccessReport=JSON.parse(await readFile(join(root,'build/report/state-access-policy.json'),'utf8'));}catch{}
const refs=access.references.filter(ref=>NAVIGATION_NAMES.includes(ref.name));
const classify=({file,access,source})=>{
  if(STATE_OWNER_FILES.includes(file))return ['owner-only','状態所有者の内部処理。公開gatewayへ移す対象ではない'];
  if(/pointer|drag|swipe|animate|animation|spin|tile/i.test(file+' '+source))return ['event-local','pointer座標・スワイプ・逐次アニメーションに密接なイベント局所値'];
  if(/primarySectionPosition|courseDefinition|runtimeNavigation|isMode\(|rememberClearedMessage|TUTORIAL_STEPS|tutorialPrompt|gripPrompt/.test(source))return ['derived-value','navigationから計算した表示・判定値で、直接参照を機械置換しない'];
  if(access==='read')return ['gateway-candidate','読み取り専用のため用途別navigation gatewayへ移行可能'];
  return ['intentional-exception','書き込みを伴うため所有者・command入口との整合確認が必要'];
};
const entries=refs.map(ref=>{
  const source=files.get(ref.file)?.[ref.line-1]?.trim()||'';
  const [category,reason]=classify({...ref,source});
  const temporary=category==='gateway-candidate';
  return {...ref,category,reason,temporary,owner:category==='owner-only'?ref.file:'runtime/runtime.js / app/app-context.js',nextMigrationUnit:temporary?'navigation context取得を入口で固定して判定へ渡す':null,expiresOn:temporary?'2026-12-31':null,relatedE2E:temporary?['browser-e2e','device-e2e','progression-flows','clear-flow-order']:[],codeEvidence:{file:ref.file,line:ref.line,source}};
});
const categories=['gateway-candidate','owner-only','derived-value','event-local','intentional-exception'];
assert.equal(entries.length,refs.length,'navigation参照の分類漏れがあります');
assert.ok(entries.every(entry=>categories.includes(entry.category)),'不明なnavigation分類があります');
const counts=Object.fromEntries(categories.map(category=>[category,entries.filter(entry=>entry.category===category).length]));
const directAssignments=[];
const contextReloads=[];
const transitionCalls=[];
const transitionFiles=['runtime/runtime.js','runtime/app-events.js','runtime/speed.js','ui/board-ui.js','ui/progression-clear-flow.js','ui/progression-ui.js'];
const transitionPattern=/\b(?:GameNavigation\.(?:stage|mastery|satori|stageMenu|speedPicker)|load(?:Stage|ExtraStage|SatoriStage))\s*\(/;
for(const [file,lines] of files){
  if(!file.startsWith('runtime/')&&!file.startsWith('ui/'))continue;
  lines.forEach((line,index)=>{
    if(file!=='runtime/runtime.js')for(const name of NAVIGATION_NAMES){if(new RegExp(`\\b${name}\\s*(?<![=!<>])=(?!=)`).test(line)&&!/\bfunction\b/.test(line))directAssignments.push({file,line:index+1,name,source:line.trim()});}
    if(/readProgressionContext\(\)/.test(line)&&/(?:readNavigationContext\(\)|WakeSevenAppContext\.snapshot\(\)|state\.navigation\.read\(\))/.test(line))contextReloads.push({file,line:index+1,source:line.trim()});
    if(transitionPattern.test(line))transitionCalls.push({file,line:index+1,source:line.trim(),allowed:transitionFiles.includes(file)});
  });
}
assert.equal(directAssignments.length,0,`UI/runtimeからのnavigation直接代入を検出しました: ${directAssignments.map(item=>`${item.file}:${item.line}`).join(', ')}`);
assert.equal(contextReloads.length,0,`context取得後のnavigation再読込を検出しました: ${contextReloads.map(item=>`${item.file}:${item.line}`).join(', ')}`);
const disallowedTransitions=transitionCalls.filter(call=>!call.allowed);
assert.equal(disallowedTransitions.length,0,`4入口外から主要遷移を呼び出しています: ${disallowedTransitions.map(item=>`${item.file}:${item.line}`).join(', ')}`);
for(const entry of entries){
  if(entry.temporary){assert.ok(entry.owner&&entry.nextMigrationUnit&&entry.expiresOn&&entry.relatedE2E.length>0,`temporary navigation候補の移行メタデータが不足しています: ${entry.file}:${entry.line}:${entry.name}`);assert.ok(Date.parse(`${entry.expiresOn}T23:59:59+09:00`)>Date.now(),`temporary navigation候補の期限が切れています: ${entry.file}:${entry.line}:${entry.name}`);}
  else assert.ok(entry.reason&&entry.owner,`navigation残件の理由または所有者がありません: ${entry.file}:${entry.line}:${entry.name}`);
}
const byName=Object.fromEntries(NAVIGATION_NAMES.map(name=>[name,entries.filter(entry=>entry.name===name).length]));
// 行や抜粋は改修で変わるため、追加検出の指紋はファイルとシンボルで固定する。
const gatewayFingerprint=entry=>`${entry.file}:${entry.name}`;
const previousGateway=new Set((previousReport?.entries||[]).filter(entry=>entry.category==='gateway-candidate').map(gatewayFingerprint));
const currentGateway=new Set(entries.filter(entry=>entry.category==='gateway-candidate').map(gatewayFingerprint));
const newGatewayCandidates=[...currentGateway].filter(value=>!previousGateway.has(value));
assert.equal(newGatewayCandidates.length,0,`新しいnavigation gateway候補を検出しました。移行理由と関連E2Eを確認してください: ${newGatewayCandidates.join(', ')}`);
const stateNavigationCount=stateAccessReport?.countsByPurpose?.navigation??null;
const report={schemaVersion:2,name:'wake7-navigation-classification',generatedAt:new Date().toISOString(),status:'passed',summary:{references:entries.length,byCategory:counts,temporaryCount:entries.filter(entry=>entry.temporary).length,temporaryZero:entries.every(entry=>!entry.temporary),byName,stateAccessNavigationReferences:stateNavigationCount,priorityOrder:['gateway-candidate','derived-value','event-local','intentional-exception','owner-only']},migrationGate:{baseline:'既存のgateway候補集合',newGatewayCandidates,addedCount:newGatewayCandidates.length,removedCount:[...previousGateway].filter(value=>!currentGateway.has(value)).length},contracts:{directAssignments,contextReloads,transitionCalls,disallowedTransitions,allowedTransitionEntrances:transitionFiles},policy:{gatewayCandidate:'未移行の間はtemporaryとして期限・所有者・次の移行単位・関連E2Eを維持',ownerOnly:'状態所有者に保持',derivedValue:'計算元と表示境界を確認',eventLocal:'イベント側に保持',intentionalException:'理由と関連E2Eを維持'},entries};
const path=join(root,'build/report/navigation-classification.json');await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(report,null,2)+'\n');
console.log(`Navigation classification OK: ${entries.length} references (${counts['gateway-candidate']} gateway candidates, ${counts['owner-only']} owner-only). Report: ${path}`);
