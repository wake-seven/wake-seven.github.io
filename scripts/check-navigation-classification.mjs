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
  if(/primarySectionPosition|courseDefinition|runtimeNavigation|isMode\(/.test(source))return ['derived-value','navigationから計算した表示・判定値で、直接参照を機械置換しない'];
  if(access==='read')return ['gateway-candidate','読み取り専用のため用途別navigation gatewayへ移行可能'];
  return ['intentional-exception','書き込みを伴うため所有者・command入口との整合確認が必要'];
};
const entries=refs.map(ref=>{const source=files.get(ref.file)?.[ref.line-1]?.trim()||'';const [category,reason]=classify({...ref,source});return {...ref,category,reason,codeEvidence:{file:ref.file,line:ref.line,source}};});
const categories=['gateway-candidate','owner-only','derived-value','event-local','intentional-exception'];
assert.equal(entries.length,refs.length,'navigation参照の分類漏れがあります');
assert.ok(entries.every(entry=>categories.includes(entry.category)),'不明なnavigation分類があります');
const counts=Object.fromEntries(categories.map(category=>[category,entries.filter(entry=>entry.category===category).length]));
const byName=Object.fromEntries(NAVIGATION_NAMES.map(name=>[name,entries.filter(entry=>entry.name===name).length]));
const gatewayFingerprint=entry=>`${entry.file}:${entry.name}:${entry.source}`;
const previousGateway=new Set((previousReport?.entries||[]).filter(entry=>entry.category==='gateway-candidate').map(gatewayFingerprint));
const currentGateway=new Set(entries.filter(entry=>entry.category==='gateway-candidate').map(gatewayFingerprint));
const newGatewayCandidates=[...currentGateway].filter(value=>!previousGateway.has(value));
assert.equal(newGatewayCandidates.length,0,`新しいnavigation gateway候補を検出しました。移行理由と関連E2Eを確認してください: ${newGatewayCandidates.join(', ')}`);
const stateNavigationCount=stateAccessReport?.countsByPurpose?.navigation??null;
const report={schemaVersion:1,name:'wake7-navigation-classification',generatedAt:new Date().toISOString(),status:'passed',summary:{references:entries.length,byCategory:counts,byName,stateAccessNavigationReferences:stateNavigationCount,priorityOrder:['gateway-candidate','derived-value','event-local','intentional-exception','owner-only']},migrationGate:{baseline:'既存のgateway候補集合',newGatewayCandidates,addedCount:newGatewayCandidates.length,removedCount:[...previousGateway].filter(value=>!currentGateway.has(value)).length},policy:{gatewayCandidate:'次の1バッチでE2E付き移行を検討',ownerOnly:'状態所有者に保持',derivedValue:'計算元と表示境界を確認',eventLocal:'イベント側に保持',intentionalException:'理由と関連E2Eを維持'},entries};
const path=join(root,'build/report/navigation-classification.json');await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(report,null,2)+'\n');
console.log(`Navigation classification OK: ${entries.length} references (${counts['gateway-candidate']} gateway candidates, ${counts['owner-only']} owner-only). Report: ${path}`);
