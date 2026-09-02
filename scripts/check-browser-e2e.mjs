import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 実ブラウザで手動・内蔵ブラウザE2Eを再現するための導線契約。
// Playwright等の実行依存は追加せず、ブラウザ側で行う操作と期待値を
// 固定する。静的なcheck-browser-flowとは別に、実際のブラウザでこの
// 手順を実行した結果を記録できるよう、対象DOMとデバッグ導線を検査する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const [template, events, clearFlow, bootstrap, speed, speedCommands, runtime] = await Promise.all([
  readFile(join(root, 'src/index.template.html'), 'utf8'),
  readFile(join(root, 'src/runtime/app-events.js'), 'utf8'),
  readFile(join(root, 'src/ui/progression-clear-flow.js'), 'utf8'),
  readFile(join(root, 'src/runtime/app-bootstrap.js'), 'utf8'),
  readFile(join(root, 'src/runtime/speed.js'), 'utf8'),
  readFile(join(root, 'src/commands/speed-commands.js'), 'utf8'),
  readFile(join(root, 'src/runtime/runtime.js'), 'utf8')
]);

const requiredIds = [
  'debugReset', 'debugSkipTutorial', 'debugIntro2', 'debugClear', 'clearDialog', 'clearNext', 'stageNumber',
  'menuSpeed', 'speedModeOptions', 'speedBoardStart', 'speedPause', 'speedPauseDialog', 'speedResume',
  'chainDialog', 'chainDialogAction', 'chainDialogPrev'
];
for (const id of requiredIds) {
  assert.match(template, new RegExp(`id=["']${id}["']`), `browser E2E target is missing: ${id}`);
}
assert.match(events, /WakeSevenEventBindings\.click\('clearNext',[\s\S]*advanceAfterClear\(\)/,
  'browser E2E target must use the unified clear-next command');
assert.match(clearFlow, /function advanceAfterClear\(/,
  'browser E2E target must expose the clear-next route');
assert.match(speedCommands, /function advanceSpeedSessionCommand\(\)[\s\S]*speedSession\.started=true/,
  'speed next-stage transition must preserve the started state');
assert.match(speed, /function loadSpeedStage\([\s\S]*if\(speedSession\.index>0\)speedSession\.started=true/,
  'speed stage loading must not re-enter start-waiting state');
assert.match(events, /\$\('debugSkipTutorial'\)\.addEventListener\('click',debugSkipTutorial\)/,
  'browser E2E target must expose the tutorial skip entry point');
assert.match(events, /WakeSevenEventBindings\.click\('menuSpeed',[\s\S]*GameNavigation\.speedPicker\(\)/,
  'browser E2E target must connect the speed menu to the speed picker');
assert.match(events, /WakeSevenEventBindings\.click\('speedBoardStart',WakeSevenProgressionCommands\.startSpeedRun\)/,
  'browser E2E target must expose the speed start command');
assert.match(events, /WakeSevenEventBindings\.click\('speedPause',[\s\S]*openSpeedPauseDialog\(\)/,
  'browser E2E target must expose the speed pause dialog route');
assert.match(events, /WakeSevenEventBindings\.click\('speedResume',resumeSpeedRun\)/,
  'browser E2E target must expose the speed resume command');
assert.match(speed, /pauseSpeedClock\(\);persistSpeedSession\(\)/,
  'speed pause must persist the session before showing the pause dialog');
assert.match(bootstrap, /restoreProgressionDialog\(storage\.json\(DIALOG_STATE_STORAGE_KEY,null\)\)/,
  'reload E2E target must restore the progression dialog state');
assert.match(events, /\$\('chainDialogAction'\)\.addEventListener\('click',[\s\S]*closeChainDialog\(\)[\s\S]*step\.onAction\(\)/,
  'dialog-chain E2E target must close the current step before running its action');

// この手順を実ブラウザで実行する。debugReset後の初回ダイアログを開始し、
// debugIntro2で入門2へ移動、debugClearで即時クリア、clearNextで入門3を確認する。
const procedure = [
  'http://127.0.0.1:8123/index.html?debug=1',
  '「リセット」を押し、開始ダイアログの「はじめる」を押す。チュートリアル盤面が表示されることを確認する',
  'デバッグの「チュートリアルをスキップ」を押し、入門クラスの連続ダイアログが表示されることを確認する',
  '連続ダイアログの「次へ」を押し、最後のステップで「はじめる」を押す。入門1（「1 / 3」）が表示されることを確認する',
  'デバッグの「入」（入門3）を押し、表示が「2 / 3」になることを確認する',
  'デバッグの「即」を押し、クリア後ダイアログが表示されることを確認する',
  '「次の問題へ →」を押し、ダイアログが閉じて表示が「3 / 3」になることを確認する',
  'ページをリロードし、表示中の問題（入門3）と、未表示のダイアログが勝手に復活しないことを確認する',
  'メニューの「速解き」を押し、速解き選択画面と「スタート」が表示されることを確認する',
  '速解き種目を選び「スタート」を押し、速解き盤面と一時停止ボタンが表示されることを確認する',
  '「一時停止」を押し、停止ダイアログと経過時間が表示されることを確認する',
  'ページをリロードし、停止ダイアログと同じ速解き種目・問題位置が復元されることを確認する',
  '「再開する」を押し、停止ダイアログが閉じてタイマーが再開することを確認する',
  'コンソールにエラーがないことを確認する'
];
console.log(JSON.stringify({
  name: 'primary-speed-reload-flow',
  purpose: '開始からチュートリアル、入門クリア遷移、ダイアログ連鎖、リロード復元、速解き一時停止・再開までを実ブラウザで確認する',
  procedure
}, null, 2));
console.log('Browser E2E targets are available; execute the printed procedure in the in-app browser.');
