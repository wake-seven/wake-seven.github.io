import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = name => readFile(join(root, name), 'utf8');
const stateSource = (await read('src/state/game-state.js')).replace(/^\s*export\s*\{\s*\};?\s*$/gm, '');
const runtimeSource = await read('src/runtime/runtime.js');
const bootstrapSource = await read('src/runtime/app-bootstrap.js');
const template = await read('src/index.template.html');
const published = await read('index.html');

// 2つのVMコンテキストで共有する小さなlocalStorage実装により、
// browser reload: JavaScript globals disappear, while storage survives.
function createStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    key: index => [...values.keys()][index] ?? null,
    get length() { return values.size; }
  };
}

function loadState(storage) {
  const windowRef = { localStorage: storage };
  windowRef.window = windowRef;
  const context = { window: windowRef, JSON };
  vm.runInNewContext(stateSource, context, { filename: 'src/state/game-state.js' });
  return { api: context.window.WakeSevenState, context };
}

const storage = createStorage();
const firstLoad = loadState(storage);
const firstState = firstLoad.api.create({
  navigation: { mode: 'mastery', lap: 2, stageIndex: 19, masteryIndex: 7, satoriIndex: 3, tutorialStep: 4 },
  board: { o: [2, 0, 1, 2, 1, 0, 2], t: [1, 2, 0], moves: 2, initial: [0, 1, 2, 0, 1, 2, 0] },
  progress: {
    lap1: { primary: [0, 1, 2], mastery: [0, 1], satori: [0] },
    lap2: { primary: [0], mastery: [], satori: [] }
  },
  unlocks: { secondLap: true, speedTraining: true },
  settings: { language: 'en', sound: false, boardTheme: 'night', darumaColor: 'blue' },
  speed: {
    activeVariant: 'training18',
    sessions: { training18: { index: 6, elapsedMs: 1234, moves: 2, paused: true } }
  },
  ui: { editingBoard: false, returnStageContext: { extra: true, satori: false, index: 0 } }
});
assert.equal(firstLoad.api.write(firstState, storage), true, 'initial state must be writable');

// Dialog state is intentionally a separate UI snapshot, but uses the same
// persistent storage boundary and is restored by app-bootstrap on startup.
storage.setItem('wake7-dialog-state', JSON.stringify({ id: 'chain', name: 'trainingWelcome', kind: null }));

const secondLoad = loadState(storage);
const restored = secondLoad.api.read(storage);
assert.ok(restored, 'state must be readable after a reload');
const assertJsonEqual = (actual, expected, message) => assert.equal(JSON.stringify(actual), JSON.stringify(expected), message);
assertJsonEqual(restored.navigation, firstState.navigation, 'navigation must survive reload');
assertJsonEqual(restored.board, firstState.board, 'board and move history must survive reload');
assertJsonEqual(restored.progress, firstState.progress, 'progress must survive reload');
assertJsonEqual(restored.unlocks, firstState.unlocks, 'unlocks must survive reload');
assertJsonEqual(restored.settings, firstState.settings, 'settings must survive reload');
assertJsonEqual(restored.speed, firstState.speed, 'speed session must survive reload');
assertJsonEqual(restored.ui, firstState.ui, 'UI session context must survive reload');
assert.deepEqual(JSON.parse(storage.getItem('wake7-dialog-state')), { id: 'chain', name: 'trainingWelcome', kind: null });

// Invalid versions are rejected instead of silently restoring incompatible data.
storage.setItem('wake7-state-vnext', JSON.stringify({ version: 999, navigation: { mode: 'satori' } }));
assert.equal(secondLoad.api.read(storage), null, 'unknown state versions must not be restored');

// Static integration checks ensure the browser entry point actually performs
// the same restore sequence tested above, including dialogs and initial paint.
for (const source of [runtimeSource, published]) {
  assert.match(source, /function restoreDialogState\(state\)/, 'dialog restore function must exist');
  assert.match(source, /(?:wake7-dialog-state|STORAGE_KEY_GROUPS\.dialogs\.state)/, 'dialog state key must be present');
  assert.match(source, /if\(state\.id==='chain'/, 'chain dialog state must be restorable');
  assert.match(source, /if\(state\.id==='message'/, 'message dialog state must be restorable');
  assert.match(source, /if\(state\.id==='guideHub'/, 'guide hub state must be restorable');
  assert.match(source, /if\(state\.id==='twoMove'/, 'pattern guide state must be restorable');
}
assert.match(bootstrapSource, /restoreActiveSession\(\);[\s\S]*restoreDialogState\(storage\.json\(DIALOG_STATE_STORAGE_KEY,null\)\);/,
  'startup must restore the active session before the dialog');
assert.match(bootstrapSource, /document\.body\.classList\.remove\('app-booting'\);/,
  'initial placeholder must remain hidden until restored state is applied');
assert.match(template, /id="(?:introDialog|chainDialog|messageDialog|guideHubDialog)"/, 'dialog templates must be present');

console.log('Validated reload-equivalent restoration for navigation, board, progress, settings, speed session, UI context, and dialogs.');
