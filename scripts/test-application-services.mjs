import assert from 'node:assert/strict';
import { createProgressionDomain } from '../src/domain/progression-domain.mjs';
import { createGameStore } from '../src/state/store.mjs';
import { createPersistence } from '../src/state/persistence.mjs';
import { createBoardQuizCatalog } from '../src/data/board-quiz.mjs';
import { createMessageCatalog, MESSAGE_TIMINGS, MESSAGE_TYPES } from '../src/data/messages-data.mjs';
import { createSatoriCatalog } from '../src/data/satori.mjs';
import { createSpeedUnlockService } from '../src/runtime/progression-runtime.mjs';

// このテストはDOM・公開版の連結順・ブラウザタイマーを使わない。
// UI接続は browser-e2e、ここでは純粋な状態・データ契約だけを検証する。

const progression = createProgressionDomain({ academyTotal: 3, trainingStart: 3, trainingTotal: 2 });
assert.deepEqual(progression.normalizeNavigation({ mode: 'stage', lap: 2, stageIndex: 4 }), {
  mode: 'stage', lap: 2, stageIndex: 4, masteryIndex: 0, satoriIndex: 0, tutorialStep: 0
});
assert.equal(progression.normalizeNavigation({ mode: 'unknown', lap: 9 }).mode, 'stage');
assert.equal(progression.indexFor({ mode: 'tutorial', tutorialStep: 2 }), 2);
assert.equal(progression.indexFor({ mode: 'mastery', masteryIndex: 4 }), 4);
assert.equal(progression.indexFor({ mode: 'satori', satoriIndex: 5 }), 5);
assert.equal(progression.indexFor({ mode: 'stage', stageIndex: 7 }), 7);
assert.deepEqual(progression.uiPolicy({ mode: 'tutorial' }), { id: 'tutorial', assisted: true });
assert.deepEqual(progression.uiPolicy({ mode: 'stage', stageIndex: 0 }), { id: 'academy', assisted: true });
assert.deepEqual(progression.uiPolicy({ mode: 'stage', stageIndex: 3 }), { id: 'training' });
assert.deepEqual(progression.uiPolicy({ mode: 'stage', stageIndex: 5 }), { id: 'standard' });
assert.deepEqual(progression.uiPolicy({ mode: 'free', stageIndex: 0 }), { id: 'standard' });

const store = createGameStore({ navigation: { mode: 'stage' }, settings: { language: 'ja' } });
let updates = 0;
const unsubscribe = store.subscribe((state, event) => {
  updates++;
  assert.ok(['update', 'replace'].includes(event.type));
  assert.ok(state);
});
store.updateSection('navigation', { stageIndex: 2 });
assert.equal(store.state.navigation.stageIndex, 2);
assert.equal(store.state.settings.language, 'ja');
const replacement = store.replace({ navigation: { mode: 'speed' } });
assert.deepEqual(replacement, { navigation: { mode: 'speed' } });
assert.equal(updates, 2);
unsubscribe();
store.update({ ignored: true });
assert.equal(updates, 2);

const values = new Map();
const storage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value))
};
const persistence = createPersistence({ storage, key: 'test-state', version: 2 });
const persisted = { navigation: { mode: 'mastery' }, nested: { list: [1, 2] } };
assert.equal(persistence.write(persisted), true);
persisted.nested.list.push(3);
assert.deepEqual(persistence.read(), { navigation: { mode: 'mastery' }, nested: { list: [1, 2] }, version: 2 });
values.set('test-state', JSON.stringify({ version: 1, navigation: {} }));
assert.equal(persistence.read(), null);
values.set('test-state', '{broken');
assert.equal(persistence.read(), null);

const quiz = createBoardQuizCatalog({ ja: { q1: { answer: 0 } }, en: { q1: { answer: 1 } } });
assert.deepEqual(quiz.languages().sort(), ['en', 'ja']);
assert.equal(quiz.hasLanguage('ja'), true);
assert.equal(quiz.hasLanguage('fr'), false);
const quizCopy = quiz.forLanguage('fr');
assert.deepEqual(quizCopy, { q1: { answer: 0 } });
quizCopy.q1.answer = 99;
assert.equal(quiz.forLanguage('ja').q1.answer, 0);

const messages = createMessageCatalog({
  welcome: { dialog: { title: 'Welcome' } },
  clear: { tip: { ja: 'Good' } },
  quiz: { quiz: { question: 'Pick' } }
});
assert.deepEqual(messages.descriptor('welcome'), {
  id: 'welcome', type: MESSAGE_TYPES.dialog, timing: MESSAGE_TIMINGS.afterClear,
  dialog: { title: 'Welcome' }
});
assert.equal(messages.descriptor('clear').type, MESSAGE_TYPES.clear);
assert.equal(messages.descriptor('quiz').type, MESSAGE_TYPES.quiz);
assert.equal(messages.descriptor('missing'), null);

const satori = createSatoriCatalog([{ id: 's1' }, { id: 's2' }]);
assert.equal(satori.all().length, 2);
const satoriCopy = satori.all();
satoriCopy[0].id = 'changed';
assert.equal(satori.all()[0].id, 's1');

const noUnlock = createSpeedUnlockService().initialize();
assert.equal(noUnlock.modeUnlocked, false);
assert.equal(noUnlock.training, false);
const unlocked = createSpeedUnlockService({
  initialUnlocks: { speedTraining: true, speedMasteryTrialCleared: true }
}).initialize();
assert.equal(unlocked.modeUnlocked, true);
assert.equal(unlocked.training, true);
assert.equal(unlocked.masteryTrial, true);
assert.equal(unlocked.intermediate, false);

console.log('application services tests passed: progression policy, store, persistence, catalogs, and speed unlocks');
