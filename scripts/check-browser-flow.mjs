import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = name => readFile(join(root, name), 'utf8');
const [template, bootstrap, events, board, interaction, tutorial, published, clearFlow, academySupport] = await Promise.all([
  read('src/index.template.html'), read('src/runtime/app-bootstrap.js'), read('src/runtime/app-events.js'),
  read('src/ui/board-ui.js'), read('src/ui/board-interaction.js'), read('src/ui/tutorial-animation.js'), read('index.html'),
  read('src/ui/progression-clear-flow.js'), read('src/ui/progression-academy-support.js')
]);
const progression = await read('src/ui/progression-ui.js');
const speed = await read('src/runtime/speed.js');
const runtime = await read('src/runtime/runtime.js');
const message = await read('src/ui/message.js');

// ブラウザ相当の導線契約。起動復元の前に画面の骨格が存在することを確認する。
// 状態と、ユーザーに見える各遷移に名前付きの統合ポイントがあることを確認する。
for (const id of ['introDialog', 'introStart', 'tutorialReset', 'board', 'reset', 'undo', 'chainDialog', 'clearDialog']) {
  assert.match(template, new RegExp(`id=["']${id}["']`), `browser flow DOM contract is missing: ${id}`);
}
assert.match(runtime, /const APP_VERSION='[^']+';/,
  'public application version must come from one source constant');
assert.match(template, /id=["']aboutVersion["']/,
  'about dialog must expose the generated public version');
assert.match(events, /\$\('aboutVersion'\)\.textContent='v'\+APP_VERSION/,
  'about dialog version must be rendered from APP_VERSION');
assert.equal((published.match(/const APP_VERSION='/g)||[]).length, 1,
  'generated public bundle must contain exactly one APP_VERSION source');
assert.match(published, /\$\('aboutVersion'\)\.textContent='v'\+APP_VERSION/,
  'generated public bundle must render the source APP_VERSION');
assert.doesNotMatch(runtime, /const STORAGE_KEYS=WakeSevenState\.STORAGE_KEYS/,
  'runtime must not depend on the flat STORAGE_KEYS API');
assert.match(bootstrap, /buildBoard\(\);[\s\S]*restoreActiveSession\(\);[\s\S]*(?:restoreDialogState|restoreProgressionDialog)\(/,
  'startup must build, restore the board, then restore dialogs');
assert.match(bootstrap, /document\.body\.classList\.remove\('app-booting'\)/,
  'startup must reveal the restored screen only after bootstrap');
for (const source of [board, published]) {
  for (const token of ['normalizeBoardPointer', 'startTutorial', 'rollOnce', 'cancelBoardAnimation']) {
    assert.match(source, new RegExp(token.replace(/[()]/g, '\\$&')), `pointer flow integration is missing: ${token}`);
  }
  assert.match(source, /renderSwipeFrame\(/, 'swipe animation must update through the frame renderer');
  assert.match(source, /startBoardAnimationSession\(/, 'swipe animation must use an animation session');
}
for (const source of [events, published]) {
  assert.match(source, /resetStoredProgress\(/, 'reset flow must have a single named entry point');
  assert.match(source, /(?:cancelBoardAnimation|cancelTileAnimations)\(/, 'reset/transition flow must cancel board animation');
}
assert.match(board, /startTutorialRewindSession\(/, 'tutorial rewind must use its session boundary');
assert.match(tutorial, /cancelTutorialRewindSession\(/, 'tutorial rewind must have a cancellation path');
assert.match(tutorial, /captureTutorialRewindDomSnapshot|restoreTutorialRewindDomSnapshot/,
  'tutorial rewind must snapshot and restore DOM order');
assert.match(clearFlow, /if\(svg\.classList\.contains\('celebrating'\)\)return (?:0|reduced\?0:820);/,
  'clear celebration must be idempotent');
assert.match(clearFlow, /function startClearFlow\(/, 'clear transition must have a named start entry point');
assert.match(clearFlow, /function finishClearFlow\(/, 'clear transition must have a named finish entry point');
assert.match(clearFlow, /function advanceAfterClear\(/, 'clear transition must have a named advance entry point');
assert.match(clearFlow, /const CLEAR_FLOW_ACTION=Object\.freeze/, 'clear transition actions must be explicit');
assert.match(clearFlow, /function dispatchClearFlowAction\(action\)/, 'clear transition actions must use one dispatcher');
assert.match(board, /if\(isSolved\(\)&&!clearShown\)/,
  'board paint must guard against duplicate clear transitions');
assert.match(board, /bindApplicationTargetTiles\(\);/,
  'application target panels must be bound when a new position is loaded');
assert.match(academySupport, /applicationTargetTiles=new Set\(\);[\s\S]*tileEls\[index\][\s\S]*applicationTargetTiles\.add\(tileEls\[index\]\)/,
  'application targets must bind to physical tile elements rather than board indexes');
assert.match(academySupport, /tileEls\.forEach\(tile=>tile\.classList\.toggle\('application-target',applicationTargetTiles\.has\(tile\)\)\)/,
  'application target rendering must preserve the physical tile binding');
assert.doesNotMatch(board, /application-target-frame/,
  'application targets must use the panel border, not a detached frame');
for (const kind of ['primary', 'mastery', 'satori']) {
  assert.match(board, new RegExp(`recordProgressClearCommand\\('${kind}'`), `clear progress command is missing: ${kind}`);
}
assert.match(board, /clearShown=true;[\s\S]*recordProgressClearCommand\('primary'/,
  'normal clear must mark the transition before recording progress');
assert.match(progression, /clearDialogUsesStageProgression\(\)/,
  'clear dialog must distinguish free/custom completion from campaign progression');
assert.match(speed, /pauseSpeedClock\(\);persistSpeedSession\(\);[\s\S]*advanceSpeedRun/,
  'speed clear must persist before advancing to the next problem');
assert.match(board, /syncGameState\(\);[\s\S]{0,240}STORAGE_KEY_GROUPS\.progression\.activeSession/,
  'active session must be persisted after the state snapshot');
assert.match(template, /body\.app-booting\{visibility:hidden\}/,
  'initial placeholder must remain hidden during reload restoration');

// クリア／メッセージダイアログの導線契約。これは意図的にソース
// DOMシミュレーターではなく契約を検査する。各経路に閉じる／進む／見直す境界が明示され、
// リロード後もクリア位置を失わずダイアログを再構築できることを確認する。
for (const id of ['clearClose', 'clearNext', 'clearTipLink', 'clearMessages',
  'messageDialog', 'messagePrev', 'messageNext', 'closeMessages', 'messageRankLink']) {
  assert.match(template, new RegExp(`id=["']${id}["']`), `dialog navigation DOM contract is missing: ${id}`);
}
assert.match(events, /WakeSevenEventBindings\.click\('clearClose',[\s\S]*hideGameDialogs\(\)[\s\S]*renderStageNav\(\)/,
  'clear close must hide the dialog and return to the stage navigation');
assert.match(events, /WakeSevenEventBindings\.click\('clearNext',[\s\S]*advanceAfterClear\(\)/,
  'clear next must use the unified clear-transition entry point');
assert.match(clearFlow, /function dispatchClearFlowAction\(action\)[\s\S]*const route=resolveAfterClearRoute[\s\S]*hideGameDialogs\(\)/,
  'clear transition must resolve its route before hiding the current dialog');
assert.match(events, /WakeSevenEventBindings\.click\('clearTipLink',handleClearTipLink\)/,
  'clear review/details link must have a named route handler');
assert.match(events, /clearMessages.*GameDialogs\.messages\(\{resume:true\}\)/,
  'clear message review must resume the saved review position');
assert.match(events, /messageDialogReturn[\s\S]*focusReturnTarget\(returnTarget\)/,
  'closing message review must restore its return dialog and focus target');
assert.match(events, /messagePrev.*moveMessageReview\(-1\)/,
  'message previous control must move within the review collection');
assert.match(events, /messageNext.*moveMessageReview\(1\)/,
  'message next control must move within the review collection');
assert.match(message, /openMessageReview\(\{resume=false,returnTarget=null\}=\{\}\)/,
  'message review must accept an explicit return target');
assert.match(message, /updateMessageReviewNavigation\(entry\)/,
  'message review must persist the current entry while navigating');
assert.match(progression, /if\((?:isMode\('free'\)|clearContext\.mode==='free')\)[\s\S]*tr\('another'\)/,
  'free clear must use its own next-action route');
assert.match(progression, /else if\((?:isMode\('custom'\)|clearContext\.mode==='custom')\)[\s\S]*tr\('again'\)/,
  'custom clear must use its own next-action route');
assert.match(progression, /else if\((?:isMode\('satori'\)|clearContext\.mode==='satori')\)[\s\S]*(?:satoriIndex|clearContext\.satoriIndex)===SATORI_STAGES\.length-1\?[\s\S]*tr\('satoriChoose'\)/,
  'satori clear must choose between the next puzzle and completion route');
assert.match(progression, /else if\((?:isMode\('mastery'\)|clearContext\.mode==='mastery')\)[\s\S]*(?:extraIndex|clearContext\.extraIndex)===EXTRA_STAGES\.length-1\?[\s\S]*tr\('toFree'\)/,
  'mastery clear must choose between the next pattern and free route');
assert.match(runtime, /if\(visible\('clearDialog'\)\)return \{type:'clear'\}/,
  'clear dialog visibility must be captured for reload restoration');
assert.match(runtime, /if\(visible\('messageDialog'\)[\s\S]*return \{type:'message'/,
  'message dialog and its review position must be captured for reload restoration');
assert.match(runtime, /state\.id==='clear'[\s\S]*clearShown&&isSolved\(\)[\s\S]*showClearDialog\(\)/,
  'restoring a clear dialog must require the solved board and clear state');
assert.match(runtime, /state\.id==='message'[\s\S]*openMessageReview\(\{resume:true\}\)/,
  'restoring message review must rebuild it through the normal resume route');

// 純粋なpointer/session境界をVMで実行する。これは意図的に
// 完全なDOMシミュレーターではなくブラウザ相当の契約を検査する。画面ブラウザなしで、
// pointerの正規化、無関係なpointerの拒否、予約済みフレームの取り消しを確認する。
const frameCallbacks = new Map();
let nextFrame = 0;
const context = {
  performance: { now: () => 100 },
  requestAnimationFrame: callback => { const id = ++nextFrame; frameCallbacks.set(id, callback); return id; },
  cancelAnimationFrame: id => frameCallbacks.delete(id),
  cancelActiveTutorialRewindSession: () => false,
  Math, console
};
vm.runInNewContext(interaction.replace(/export\s*\{[^}]*\};?\s*$/m, ''), context, { filename: 'board-interaction.js' });
const point = context.normalizeBoardPointer({ pointerId: 4, pointerType: 'touch', button: 0, clientX: 12, clientY: 8 }, event => ({ x: event.clientX, y: event.clientY }));
assert.equal(point.point.x, 12);
assert.equal(point.point.y, 8);
const operation = context.startBoardPointerContext(point, { x: 0, y: 0 });
assert.equal(context.isBoardPointerEventFor(operation, { pointerId: 4 }), true);
assert.equal(context.isBoardPointerEventFor(operation, { pointerId: 9 }), false);
const session = context.startBoardAnimationSession('swipe', 4);
let frameRan = false;
assert.ok(context.requestBoardAnimationFrame(session, () => { frameRan = true; }));
context.cancelBoardAnimation('pointercancel');
assert.equal(frameCallbacks.size, 0, 'cancel must remove the pending animation frame');
assert.equal(frameRan, false, 'cancelled animation must not run its callback');
const secondSession = context.startBoardAnimationSession('second-swipe', 4);
assert.equal(context.isBoardAnimationSessionActive(session), false, 'starting a new animation must retire the previous session');
assert.equal(context.finishBoardAnimationSession(session), false, 'an already cancelled session must not finish twice');
context.finishBoardAnimationSession(secondSession);

console.log('Validated browser-equivalent startup, tutorial, pointer, rewind, reset, and reload flow contracts.');
