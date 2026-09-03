// progression 周辺の責務を、現在のシンボル索引から自動分類する。
// 手書きの関数一覧を持たず、生成物を解析の入口として使えるようにする。
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
const indexPath = join(reportDir, 'symbol-index.json');
const symbolIndex = JSON.parse(await readFile(indexPath, 'utf8'));
const targetFiles = /(?:^|\/)(?:progression[^/]*|clear-flow|master-dialog|rank)\.(?:js|mjs)$/i;
const symbols = Object.values(symbolIndex.definitions || {}).filter(symbol => targetFiles.test(symbol.file || ''));

// 関数本体の比較用に、progression対象ファイルだけを読み込む。
// AST変換や削除は行わず、完全一致した本体だけを「実際の重複」として扱う。
const sourceCache = new Map();
const sourceText = async file => {
  if (!sourceCache.has(file)) sourceCache.set(file, await readFile(join(root, 'src', file), 'utf8').catch(() => ''));
  return sourceCache.get(file);
};
const functionBodies = new Map();
const extractFunctions = text => {
  const result = [];
  const pattern = /(?:function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)\s*\{/g;
  for (const match of text.matchAll(pattern)) {
    const name = match[1] || match[2];
    const start = match.index + match[0].length - 1;
    let depth = 0;
    let end = start;
    for (; end < text.length; end++) {
      if (text[end] === '{') depth++;
      if (text[end] === '}' && --depth === 0) break;
    }
    const body = text.slice(start + 1, end).replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
    if (body) result.push({ name, body });
  }
  return result;
};
for (const file of new Set(symbols.map(symbol => symbol.file))) {
  for (const fn of extractFunctions(await sourceText(file))) functionBodies.set(`${file}:${fn.name}`, fn.body);
}
const duplicateBodies = new Map();
for (const [key, body] of functionBodies) {
  const group = duplicateBodies.get(body) || [];
  group.push(key);
  duplicateBodies.set(body, group);
}

const rules = [
  ['clear-flow', /clear|complete|finish|solved|reward|celebrat|transition/i],
  ['dialog', /dialog|message|intro|welcome|milestone|tip|quiz/i],
  ['stage-picker', /picker|stage|volume|section|round|chapter/i],
  ['navigation', /navigate|route|return|advance|start|open|close|back|next|menu|select/i],
  ['rank', /rank|title|master|名人|称号/i],
  ['render', /render|paint|view|badge|label|text|html|template|display/i],
  ['state', /state|storage|persist|unlock|cleared|lap|variant|mode|session|progress/i]
];

// 責務名とは別に、調査時に追う順番を示す。これは実行時の制御ではなく、
// 「入口→状態判定→遷移決定→表示更新」の縦の流れをレポートに固定するための分類。
const flowRules = [
  ['entry', /^(?:ProgressionEntryPoints|GameNavigation|GameDialogs|WakeSevenProgressionCommands)$/i],
  ['state-decision', /(?:can|should|resolve|derive|normalize|is[A-Z]|has[A-Z]|current|next|previous|unlock|clear(?:ed)?|progress|policy|context)/i],
  ['transition', /(?:advance|start|finish|complete|load|open|close|return|navigate|select|route|dispatch|restore|reset)/i],
  ['render', /(?:render|paint|show|hide|update|display|dialog|message|quiz|hint|title|rank|badge|label)/i]
];

function flowRoles(symbol) {
  const text = `${symbol.name} ${symbol.file}`;
  if (/^(?:ProgressionEntryPoints|GameNavigation|GameDialogs|WakeSevenProgressionCommands)$/.test(symbol.name)) return ['entry'];
  const roles = flowRules.filter(([, pattern]) => pattern.test(text)).map(([role]) => role);
  if (roles.includes('entry')) return ['entry'];
  return [...new Set(roles.length ? roles : ['unclassified'])];
}

// 読み始めるときの主責務を4分類へ固定する。複数のflowRolesを残したまま、
// 入口・状態判断・遷移・表示のどこを最初に追うべきかを機械的に示す。
function flowClassification(roles) {
  if (roles.includes('transition') && (roles.includes('state-decision') || roles.includes('render'))) return 'orchestration';
  if (roles.includes('state-decision')) return 'state-decision';
  if (roles.includes('transition')) return 'transition';
  return 'render';
}

function classify(symbol) {
  const text = `${symbol.name} ${symbol.file}`;
  // ファイルの責務を優先し、関数名に複数の語がある場合は入口の役割を安定させる。
  if (/progression-policy|progression-runtime|game-state/i.test(symbol.file)) return 'state';
  if (/master-dialog|progression-dialogs/i.test(symbol.file)) return 'dialog';
  if (/progression-clear-flow|clear-flow/i.test(symbol.file)) return 'clear-flow';
  if (/progression-render|progression-hud|progression-hints/i.test(symbol.file)) return 'render';
  if (/rank/i.test(symbol.file)) return 'rank';
  for (const [role, pattern] of rules) if (pattern.test(text)) return role;
  return 'unclassified';
}

const entries = symbols
  .sort((a, b) => String(a.file).localeCompare(String(b.file)) || Number(a.line || 0) - Number(b.line || 0) || String(a.name).localeCompare(String(b.name)))
  .map(symbol => ({
    name: symbol.name,
    file: symbol.file,
    line: symbol.line,
    kind: symbol.kind,
    responsibility: classify(symbol),
    flowRoles: flowRoles(symbol),
    flowClassification: flowClassification(flowRoles(symbol)),
    mixedResponsibility: flowRoles(symbol).length > 1,
    callers: (symbol.callers || []).filter(caller => caller.caller).map(caller => `${caller.file}:${caller.line}:${caller.caller}`)
  }));
const classifyCandidate = entry => {
  const body = functionBodies.get(`${entry.file}:${entry.name}`) || '';
  const duplicateGroup = duplicateBodies.get(body) || [];
  if (body && duplicateGroup.length > 1) return {
    category: 'duplicate', priority: 1,
    reason: `関数本体が完全一致する候補が${duplicateGroup.length}件あります: ${duplicateGroup.filter(key => key !== `${entry.file}:${entry.name}`).join(', ')}`,
    evidence: { duplicateSymbols: duplicateGroup }
  };
  const callCount = [...body.matchAll(/\b(?:show|render|open|close|advance|start|finish|complete|update|paint|navigate|resolve|dispatch)[A-Za-z_$\w]*\s*\(/g)].length;
  if (entry.flowRoles.includes('transition') && (entry.flowRoles.includes('state-decision') || entry.flowRoles.includes('render')) && callCount >= 2) return {
    category: 'orchestrator', priority: 3,
    reason: '状態判定・遷移・表示の複数処理を順序づける呼び出しがあり、正当なオーケストレーター候補です。',
    evidence: { callCount }
  };
  if (entry.flowRoles.includes('render') && entry.flowRoles.includes('transition')) return {
    category: 'display-transition-mixed', priority: 2,
    reason: '表示更新と遷移処理の両方を含むため、変更時に影響範囲を確認する候補です。',
    evidence: { callCount }
  };
  return null;
};
const candidateEntries = entries.map(entry => ({ ...entry, candidate: classifyCandidate(entry) })).filter(entry => entry.candidate);
const candidateCounts = Object.fromEntries([...new Set(candidateEntries.map(entry => entry.candidate.category))].sort().map(category => [category, candidateEntries.filter(entry => entry.candidate.category === category).length]));
const structuralExceptions = {
  // 既存の公開入口・UI復帰・演出制御は、責務境界をまたぐことが仕様上必要なため許可する。
  // 新しい関数はここへ自動追加せず、理由を確認した変更でのみ追加する。
  majorTransition: new Set(['startClearFlow', 'resetClearFlow', 'finishClearFlowDialog', 'finishClearFlow', 'advanceAfterClear', 'dispatchClearFlowAction', 'returnToClearDialog', 'openDialog', 'closeProgressionDialog', 'closeProgressionQuiz', 'openTwoMovePatterns', 'openTwoMoveDetail', 'closeTwoMoveDetail', 'finishDetailDrag', 'closeStagePicker', 'openSatoriPicker', 'openStagePickerAt', 'openStagePicker', 'openStagePickerForRank', 'returnToStageMode', 'openRankDialog', 'openRankDialogFrom']),
  decisionDom: new Set(['refreshGuidedBasicCandidates', 'celebrateClear', 'prepareStagePicker', 'appendStagePickerButton']),
  renderState: new Set(['renderStageNav', 'renderStagePicker']),
  clearSkip: new Set(['resolveAfterClearRoute', 'dispatchClearFlowAction', 'advanceAfterClear'])
};
const structuralExceptionReasons = {
  majorTransition: '公開入口・共通ダイアログ入口、またはクリアフローのオーケストレーターとして複数経路から呼ばれるため許可。',
  decisionDom: '既存のUI補助関数として表示更新を担当するため許可。',
  renderState: '描画と同時に表示用の派生状態を更新する既存経路のため許可。',
  clearSkip: 'ルート決定済みのクリアフローから、次の問題・連鎖へ進める唯一の実行箇所のため許可.'
};
const structuralFindings = [];
for (const entry of entries) {
  if (entry.kind !== 'function') continue;
  const body = functionBodies.get(`${entry.file}:${entry.name}`) || '';
  const transition = entry.flowRoles.includes('transition');
  const hasDomWrite = /(?:textContent|innerHTML|outerHTML|\.hidden\s*=|classList\.(?:add|remove|toggle)|insertAdjacentHTML)\s*[=(]/.test(body);
  const hasStateWrite = /(?:activeMode|lastStageMode|stageIndex|extraIndex|satoriIndex|clearShown|pickerLap|pickerRound)\s*(?:=|\+\+|--)|WakeSevenAppContext\.state\.[A-Za-z]+\.(?:update|set)\s*\(/.test(body);
  const externallyCalled = entry.callers.some(caller => /runtime\/app-events\.js|commands\/|ui\/progression-ui\.js/.test(caller));
  if (transition && !entry.flowRoles.includes('entry') && (!entry.callers.length || externallyCalled)) {
    const allowed = structuralExceptions.majorTransition.has(entry.name);
    structuralFindings.push({kind:'major-transition-outside-entry', name:entry.name, file:entry.file, line:entry.line, priority:2, allowed, reason:allowed?structuralExceptionReasons.majorTransition:'主要遷移名を持つが、4入口または既知の遷移入口以外から直接呼ばれるか、呼び出し元を確認できません。', evidence:{callers:entry.callers, externallyCalled}});
  }
  if (entry.flowClassification==='state-decision' && !entry.flowRoles.includes('render') && hasDomWrite) {
    const allowed = structuralExceptions.decisionDom.has(entry.name);
    structuralFindings.push({kind:'decision-dom-mutation', name:entry.name, file:entry.file, line:entry.line, priority:2, allowed, reason:allowed?structuralExceptionReasons.decisionDom:'状態判定分類の関数内にDOM書き換えがあります。判定と表示を分離できるか確認します。', evidence:{domWrite:true}});
  }
  if (entry.flowClassification==='render' && hasStateWrite) {
    const allowed = structuralExceptions.renderState.has(entry.name);
    structuralFindings.push({kind:'render-state-mutation', name:entry.name, file:entry.file, line:entry.line, priority:2, allowed, reason:allowed?structuralExceptionReasons.renderState:'表示分類の関数内に進行状態の書き換えがあります。描画と状態変更を分離できるか確認します。', evidence:{stateWrite:true}});
  }
  if (/ui\/progression-clear-flow\.js$/i.test(entry.file) && /(?:loadStage|loadExtraStage|loadSatoriStage|openChainedDialog|openStagePicker)\s*\(/.test(body)) {
    const allowed = structuralExceptions.clearSkip.has(entry.name);
    structuralFindings.push({kind:'clear-flow-direct-skip', name:entry.name, file:entry.file, line:entry.line, priority:1, allowed, reason:allowed?structuralExceptionReasons.clearSkip:'クリアフローから次の画面・問題へ直接遷移しています。ルート決定入口を経由するか確認します。', evidence:{directCalls:[...body.matchAll(/(?:loadStage|loadExtraStage|loadSatoriStage|openChainedDialog|openStagePicker)\s*\(/g)].map(match => match[0])}});
  }
}
const structuralFindingCounts = Object.fromEntries([...new Set(structuralFindings.map(finding => finding.kind))].sort().map(kind => [kind, structuralFindings.filter(finding => finding.kind===kind).length]));
const counts = Object.fromEntries([...new Set(entries.map(entry => entry.responsibility))].sort().map(role => [role, entries.filter(entry => entry.responsibility === role).length]));
const flowCounts = Object.fromEntries([...new Set(entries.flatMap(entry => entry.flowRoles))].sort().map(role => [role, entries.filter(entry => entry.flowRoles.includes(role)).length]));
const flowClassifications = Object.fromEntries(['state-decision', 'transition', 'render', 'orchestration'].map(role => [role, entries.filter(entry => entry.flowClassification === role).length]));
const fileSummary = Object.values(entries.reduce((summary, entry) => {
  const item = summary[entry.file] ||= { file: entry.file, symbols: 0, responsibilities: new Set(), flowRoles: new Set(), mixedSymbols: 0 };
  item.symbols++;
  item.responsibilities.add(entry.responsibility);
  entry.flowRoles.forEach(role => item.flowRoles.add(role));
  if (entry.mixedResponsibility) item.mixedSymbols++;
  return summary;
}, {})).map(item => ({ ...item, responsibilities: [...item.responsibilities].sort(), flowRoles: [...item.flowRoles].sort() })).sort((a, b) => a.file.localeCompare(b.file));
const report = {
  generatedAt: new Date().toISOString(),
  source: 'build/report/symbol-index.json',
  target: 'progression-related symbols',
  summary: { symbols: entries.length, files: new Set(entries.map(entry => entry.file)).size, responsibilities: counts, flowRoles: flowCounts, flowClassifications, mixedSymbols: entries.filter(entry => entry.mixedResponsibility).length, unclassifiedSymbols: entries.filter(entry => entry.responsibility === 'unclassified').length, candidates: candidateCounts, structuralFindings: structuralFindingCounts },
  pipeline: ['entry', 'state-decision', 'transition', 'render'],
  fileSummary,
  mixedResponsibilitySymbols: entries.filter(entry => entry.mixedResponsibility).map(entry => ({ name: entry.name, file: entry.file, line: entry.line, flowRoles: entry.flowRoles })),
  candidateClassifications: candidateEntries.map(entry => ({ name: entry.name, file: entry.file, line: entry.line, flowRoles: entry.flowRoles, category: entry.candidate.category, priority: entry.candidate.priority, reason: entry.candidate.reason, evidence: entry.candidate.evidence })),
  structuralFindings,
  unclassifiedSymbols: entries.filter(entry => entry.responsibility === 'unclassified').map(entry => ({ name: entry.name, file: entry.file, line: entry.line })),
  entries,
  note: '責務は関数名・ファイル名からの監査用分類。移動・削除・統合を自動実行しない。'
};
await mkdir(reportDir, { recursive: true });
await writeFile(join(reportDir, 'progression-responsibility.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Generated progression responsibility report: ${entries.length} symbols.`);
