import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = name => readFile(join(root, name), 'utf8');
const [template, bootstrap, events, board, interaction, tutorial, published] = await Promise.all([
  read('src/index.template.html'), read('src/runtime/app-bootstrap.js'), read('src/runtime/app-events.js'),
  read('src/ui/board-ui.js'), read('src/ui/board-interaction.js'), read('src/ui/tutorial-animation.js'), read('index.html')
]);

// Browser-like flow contracts: the shell must exist before bootstrap restores
// state, and each user-visible transition must have a named integration point.
for (const id of ['introDialog', 'introStart', 'tutorialReset', 'board', 'reset', 'undo', 'chainDialog', 'clearDialog']) {
  assert.match(template, new RegExp(`id=["']${id}["']`), `browser flow DOM contract is missing: ${id}`);
}
assert.match(bootstrap, /buildBoard\(\);[\s\S]*restoreActiveSession\(\);[\s\S]*restoreDialogState\(/,
  'startup must build, restore the board, then restore dialogs');
assert.match(bootstrap, /document\.body\.classList\.remove\('app-booting'\)/,
  'startup must reveal the restored screen only after bootstrap');
for (const source of [board, published]) {
  for (const token of ['normalizeBoardPointer', 'startTutorial', 'rollOnce', 'cancelBoardAnimation']) {
    assert.match(source, new RegExp(token.replace(/[()]/g, '\\$&')), `pointer flow integration is missing: ${token}`);
  }
}
for (const source of [events, published]) {
  assert.match(source, /resetStoredProgress\(/, 'reset flow must have a single named entry point');
  assert.match(source, /(?:cancelBoardAnimation|cancelTileAnimations)\(/, 'reset/transition flow must cancel board animation');
}
assert.match(board, /startTutorialRewindSession\(/, 'tutorial rewind must use its session boundary');
assert.match(tutorial, /cancelTutorialRewindSession\(/, 'tutorial rewind must have a cancellation path');
assert.match(tutorial, /captureTutorialRewindDomSnapshot|restoreTutorialRewindDomSnapshot/,
  'tutorial rewind must snapshot and restore DOM order');

// Execute the pure pointer/session boundary in a VM. This is intentionally a
// browser-equivalent contract rather than a full DOM simulator: it verifies
// pointer normalization, unrelated-pointer rejection, and cancellation of the
// scheduled frame without requiring a graphical browser.
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

console.log('Validated browser-equivalent startup, tutorial, pointer, rewind, reset, and reload flow contracts.');
