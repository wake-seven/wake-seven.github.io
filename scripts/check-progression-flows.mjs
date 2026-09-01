import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const read = name => readFile(join(root, name), 'utf8');
const [policy, state, events, template] = await Promise.all([
  read('src/state/progression-policy.js'),
  read('src/state/game-state.js'),
  read('src/runtime/app-events.js'),
  read('src/index.template.html')
]);

for (const id of ['training9', 'training18', 'mastery27', 'satori73']) {
  assert.match(policy, new RegExp(`id:'${id}'`), `Canonical speed id is missing: ${id}`);
}
assert.doesNotMatch(policy, /id:'(?:training18_old|mastery15|mastery24|satori_old)'/, 'Legacy speed id remains in progression policy.');
assert.match(state, /activeVariant:[^\n]*'training9'/, 'Speed state default is missing.');
assert.match(events, /speedPause|pauseSpeedRun/, 'Speed pause flow is not wired.');
assert.match(events, /speedResume|resumeSpeedRun|startSpeedClock/, 'Speed resume/start flow is not wired.');
for (const id of ['settingsDialog', 'menuSettings', 'settingsDialogClose']) {
  assert.match(template, new RegExp(`id="${id}"`), `Settings UI contract is missing: ${id}`);
}
for (const id of ['menuSettings', 'settingsDialogClose']) {
  assert.match(events, new RegExp(`['"]${id}['"]`), `Settings event binding is missing: ${id}`);
}
assert.match(events, /STORAGE_KEY_GROUPS\.settings/, 'Settings persistence boundary is missing.');
console.log('Validated progression, speed-run, and settings flow contracts.');
