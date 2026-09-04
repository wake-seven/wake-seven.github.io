import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// クリア処理の「順番」をソースから検査する。関数が存在するだけでなく、
// 完了判定→保存→演出→ダイアログ→次の経路、の順序が崩れたらゲートを止める。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = name => readFile(join(root, name), 'utf8');
const [board, clearFlow, speed, progression, runtime] = await Promise.all([
  read('src/ui/board-ui.js'), read('src/ui/progression-clear-flow.js'),
  read('src/runtime/speed.js'), read('src/ui/progression-ui.js'), read('src/runtime/runtime.js')
]);
const checks = [];
const ordered = (text, tokens, id) => {
  let cursor = -1;
  const positions = {};
  for (const token of tokens) {
    const position = text.indexOf(token, cursor + 1);
    assert.ok(position >= 0, `${id}: missing ${token}`);
    assert.ok(position > cursor, `${id}: order violation at ${token}`);
    positions[token] = position;
    cursor = position;
  }
  checks.push({ id, passed: true, positions });
};

ordered(clearFlow, [
  'function startClearFlow(', 'beginClearFlow()', 'persistClearFlowCheckpoint()',
  'celebrateClear()', 'scheduleClearFlowDialog(', 'function finishClearFlow(',
  "requestProgressionDialog('clear'"
], 'campaign-clear');
ordered(clearFlow, [
  'function dispatchClearFlowAction(', 'const route=resolveAfterClearRoute(context)',
  'persistClearFlowCheckpoint()', 'hideGameDialogs()', 'setClearFlowPhase('
], 'campaign-next');
ordered(speed, [
  'function completeSpeedStage()', 'setClearShownCommand(true);',
  'pauseSpeedClock();persistSpeedSession();', 'celebrateClear()',
  "setUiEffectTimer('clear-transition','advance-speed'"
], 'speed-clear');
assert.match(board, /isMode\('speed'\)&&isSolved\(\)&&!clearShown[\s\S]*?(?:completeSpeedStage|ProgressionEntryPoints\.finishStage)/,
  'speed clear detection must be guarded by solved and clearShown state');
checks.push({ id: 'speed-clear-guard', passed: true });
ordered(progression, [
  'function showClearDialog(', 'showProgressionQuiz({rootId:\'clearQuiz\'',
  'showProgressionQuiz({rootId:\'boardQuiz\''
], 'clear-content');
assert.match(progression, /function renderClearQuiz\(\)/,
  'clear dialog quiz renderer must remain available');
assert.match(progression, /function clearDialogUsesStageProgression\(\)/,
  'clear dialog must have an explicit campaign/free route predicate');
checks.push({ id: 'clear-route-predicate', passed: true });
assert.match(clearFlow, /function finishClearFlowDialog\(\)\{[\s\S]*animationPending[\s\S]*return true[\s\S]*return clearFlowPhase===CLEAR_FLOW_PHASE\.dialog/,
  'clear dialog phase must not be entered from an unrelated flow phase');
assert.match(clearFlow, /const CLEAR_FLOW_TRANSITIONS=Object\.freeze\(/,
  'clear flow phases must have an explicit transition map');
assert.match(clearFlow, /function isClearFlowTransitionAllowed\(from,to\)/,
  'clear flow phase changes must validate the transition map');
assert.match(clearFlow, /function getClearFlowTrace\(\)\{return clearFlowTrace\.slice\(\);\}/,
  'clear flow transitions must expose a read-only diagnostic trace');
assert.match(clearFlow, /if\(!allowed\)\{[\s\S]*不正な段階遷移/,
  'invalid clear flow transitions must be observable');
assert.match(runtime, /(?:state\.id==='clear'[\s\S]*createClearTransitionContext\(\)[\s\S]*showClearDialog\(|clear:\(\)=>\{if\(!\(clearShown&&isSolved\(\)\)\)[\s\S]*createClearTransitionContext\(\)[\s\S]*showClearDialog\()/,
  'reload clear dialog must restore through an explicit clear context');
checks.push({ id: 'clear-phase-guard', passed: true });
assert.match(clearFlow, /function createClearTransitionContext\(nextStageIndex\)\{[\s\S]*const (?:navigation=readNavigationContext\(\)|\{navigation\}=readProgressionContext\(\))/,
  'clear transition context must capture navigation at the flow entry');
assert.match(clearFlow, /const mode=navigation\.mode[\s\S]*const lap=navigation\.lap[\s\S]*const currentStageIndex=navigation\.stageIndex/,
  'clear transition context must derive route fields from the captured navigation context');
assert.match(clearFlow, /function dispatchClearFlowAction\(action\)[\s\S]*const (?:navigation=readNavigationContext\(\)|\{navigation\}=readProgressionContext\(\))[\s\S]*createClearTransitionContext\(navigation\.stageIndex\+1\)/,
  'clear next route fallback must use the entry navigation context');
assert.match(runtime, /(?:state\.id==='clear'[\s\S]*clearShown&&isSolved\(\)[\s\S]*showClearDialog\([^)]*\)|clear:\(\)=>\{if\(!\(clearShown&&isSolved\(\)\)\)[\s\S]*showClearDialog\([^)]*\))/,
  'reload clear dialog must require a solved board and clearShown');
checks.push({ id: 'reload-clear-guard', passed: true });

const report = {
  schemaVersion: 1,
  name: 'clear-flow-order',
  generatedAt: new Date().toISOString(),
  status: 'passed',
  passed: true,
  summary: { checks: checks.length, stages: ['complete', 'checkpoint', 'animation', 'dialog', 'message/quiz', 'next route', 'next stage'] },
  checks,
  warnings: [], errors: [], sourceRevision: 'working-tree'
};
const reportPath = join(root, 'build', 'report', 'clear-flow-order.json');
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(`Clear flow order OK: ${checks.length} checks.`);
console.log(`Report: ${relative(root, reportPath)}`);
