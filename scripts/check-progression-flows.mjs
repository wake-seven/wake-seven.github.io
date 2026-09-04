import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const read = name => readFile(join(root, name), 'utf8');
const [policy, state, events, template, academy] = await Promise.all([
  read('src/state/progression-policy.js'),
  read('src/state/game-state.js'),
  read('src/runtime/app-events.js'),
  read('src/index.template.html'),
  read('src/ui/progression-academy-support.js')
]);

for (const id of ['training9', 'training18', 'mastery27', 'satori73']) {
  assert.match(policy, new RegExp(`id\\s*:\\s*'${id}'`), `Canonical speed id is missing: ${id}`);
}
assert.doesNotMatch(policy, /id\s*:\s*'(?:training18_old|mastery15|mastery24|satori_old)'/, 'Legacy speed id remains in progression policy.');
assert.match(state, /activeVariant:[^\n]*'training9'/, 'Speed state default is missing.');
assert.match(events, /speedPause|pauseSpeedRun/, 'Speed pause flow is not wired.');
assert.match(events, /speedResume|resumeSpeedRun|startSpeedClock/, 'Speed resume/start flow is not wired.');
assert.match(academy, /questionIndex=Math\.max\(0,Number\(speedSession\?\.index\)\|\|0\)/, '九番勝負の段階的な棒本数計算がありません。');
assert.match(academy, /questionIndex<3\?3:questionIndex<6\?4:5/, '九番勝負の棒本数境界が不正です。');
const speed = await read('src/runtime/speed.js');
const speedCommands = await read('src/commands/speed-commands.js');
assert.match(speed, /readSpeedSession\(requestedVariant\)/, '速解き開始時に選択variantを明示していません。');
assert.match(speed, /SPEED_MODE_DEFINITIONS\[speedSession\.variant\]/, '速解きの問題プールがセッションvariantを基準にしていません。');
assert.match(speedCommands, /speedSessionStorageKey\(variant\)/, '速解き保存先がセッションvariantを基準にしていません。');
for (const id of ['settingsDialog', 'menuSettings', 'settingsDialogClose']) {
  assert.match(template, new RegExp(`id="${id}"`), `Settings UI contract is missing: ${id}`);
}
for (const id of ['menuSettings', 'settingsDialogClose']) {
  assert.match(events, new RegExp(`['"]${id}['"]`), `Settings event binding is missing: ${id}`);
}
assert.match(events, /STORAGE_KEY_GROUPS\.settings/, 'Settings persistence boundary is missing.');
console.log('Validated progression, speed-run, and settings flow contracts.');
