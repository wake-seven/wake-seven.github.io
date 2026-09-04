import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 局所UI変更用の軽量契約。対象ボタンのHTML・イベント・HUD公開が一組で存在することを確認する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = path => readFile(join(root, path), 'utf8');
const [template, events, hud] = await Promise.all([
  read('src/index.template.html'),
  read('src/runtime/app-events.js'),
  read('src/ui/progression-hud.js')
]);
for (const id of ['debugBasic11', 'debugApplication20', 'debugSecondBasic11', 'debugSecondApplication20']) {
  assert.equal((template.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `${id}: template定義が1件必要です`);
  assert.ok(events.includes(`$('${id}').addEventListener`), `${id}: clickイベントが必要です`);
  assert.ok(hud.includes(`'${id}'`), `${id}: HUD公開リストが必要です`);
}
assert.ok(events.includes('BASIC_STAGE_START+BASIC_STAGE_COUNT-1'), '基本クラスのデバッグ着地点が必要です');
assert.ok(events.includes("debugUnlockStageCheckpoint(DEVELOPMENT_STAGE_START-1)"), '応用クラスのデバッグ着地点が必要です');
console.log('Micro UI contract OK: debug buttons, event wiring, and HUD registration are consistent.');
