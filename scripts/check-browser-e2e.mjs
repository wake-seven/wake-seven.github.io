import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 実ブラウザで手動・内蔵ブラウザE2Eを再現するための導線契約。
// Playwright等の実行依存は追加せず、ブラウザ側で行う操作と期待値を
// 固定する。静的なcheck-browser-flowとは別に、実際のブラウザでこの
// 手順を実行した結果を記録できるよう、対象DOMとデバッグ導線を検査する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const [template, events, clearFlow] = await Promise.all([
  readFile(join(root, 'src/index.template.html'), 'utf8'),
  readFile(join(root, 'src/runtime/app-events.js'), 'utf8'),
  readFile(join(root, 'src/ui/progression-clear-flow.js'), 'utf8')
]);

const requiredIds = [
  'debugReset', 'debugIntro2', 'debugClear', 'clearDialog', 'clearNext', 'stageNumber'
];
for (const id of requiredIds) {
  assert.match(template, new RegExp(`id=["']${id}["']`), `browser E2E target is missing: ${id}`);
}
assert.match(events, /WakeSevenEventBindings\.click\('clearNext',[\s\S]*advanceAfterClear\(\)/,
  'browser E2E target must use the unified clear-next command');
assert.match(clearFlow, /function advanceAfterClear\(/,
  'browser E2E target must expose the clear-next route');

// この手順を実ブラウザで実行する。debugReset後の初回ダイアログを開始し、
// debugIntro2で入門2へ移動、debugClearで即時クリア、clearNextで入門3を確認する。
const procedure = [
  'http://127.0.0.1:8123/index.html?debug=1',
  '「リセット」を押し、開始ダイアログの「はじめる」を押す',
  'デバッグの「入」（入門3）を押し、表示が「2 / 3」になることを確認する',
  'デバッグの「即」を押し、クリア後ダイアログが表示されることを確認する',
  '「次の問題へ →」を押し、ダイアログが閉じて表示が「3 / 3」になることを確認する',
  'コンソールにエラーがないことを確認する'
];
console.log(JSON.stringify({ name: 'academy-2-clear-next', procedure }, null, 2));
console.log('Browser E2E targets are available; execute the printed procedure in the in-app browser.');
