import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const html = await readFile(join(root, 'index.html'), 'utf8');
const stateModule = await readFile(join(root, 'src', 'game-state.js'), 'utf8');
const progressionModule = await readFile(join(root, 'src', 'progression-policy.js'), 'utf8');
const required = [
  'WAKE7:STATE-MODULE:START',
  'WAKE7:PROGRESSION-POLICY:START',
  'WAKE7:APPLICATION-MODULES:START',
  'wake7-state-vnext',
  'WakeSevenProgression',
  'const ACTIVE_MODES=',
  'const SPEED_MODE_DEFINITIONS=',
  'function restoreActiveSession()',
  'const GameNavigation=',
  'const GameDialogs=',
  'const GameBoard=',
  '// ===== クイズUI =====',
  '// ===== メッセージUI =====',
  'function buildMessageReviewEntries()',
  'function boardQuizPatternState('
];
const missing = required.filter(token => !html.includes(token));
if (missing.length) throw new Error(`index.html is missing: ${missing.join(', ')}`);

const moduleMarkers = [
  '// ===== 基礎データ =====',
  '// ===== 実行状態 =====',
  '// ===== スピードラン(速解き)ランタイム =====',
  '// ===== 盤面アニメーション補助 =====',
  '// ===== 盤面UI =====',
  '// ===== クイズUI =====',
  '// ===== メッセージUI =====',
  '// ===== 進行表示 =====',
  '// ===== 進行UI =====',
  '// ===== イベントと起動 ====='
];
const markerPositions = moduleMarkers.map(marker => html.indexOf(marker));
if (markerPositions.some(position => position < 0)
  || markerPositions.some((position, index) => index > 0 && position <= markerPositions[index - 1])) {
  throw new Error('Application modules are missing or out of order in generated index.html.');
}

const countDefinitions = (source, name) => {
  const matches = source.match(new RegExp(`function\\s+${name}\\s*\\(`, 'g')) || [];
  if (matches.length !== 1) throw new Error(`${name} must have exactly one function definition, found ${matches.length}.`);
};
for (const name of [
  'showClearDialog', 'renderClearTip', 'buildMessageReviewEntries', 'openMessageReview', 'moveMessageReview',
  'boardQuizPatternState', 'boardQuizPresentation', 'boardQuizMarkup', 'bindBoardQuizAnswerEvents'
]) countDefinitions(html, name);

const sourceModules = [
  ['src/quiz-ui.js', ['boardQuizPatternState', 'boardQuizPresentation', 'boardQuizMarkup', 'bindBoardQuizAnswerEvents']],
  ['src/message-ui.js', ['buildMessageReviewEntries', 'openMessageReview', 'moveMessageReview']],
  ['src/progression-ui.js', ['showClearDialog', 'renderClearTip']]
];
for (const [moduleName, names] of sourceModules) {
  const moduleSource = await readFile(join(root, moduleName), 'utf8');
  for (const name of names) {
    if (!moduleSource.includes(`function ${name}(`)) {
      throw new Error(`${moduleName} is missing ${name}().`);
    }
  }
}

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);
for (const script of inlineScripts) new Function(script);

const modeBoundary = html.indexOf('const isMode=mode=>activeMode===mode;');
const gameCode = modeBoundary >= 0 ? html.slice(modeBoundary) : '';
const legacyModeRefs = gameCode.match(/(?<!['"])\b(?:extraMode|satoriMode|speedMode|freeMode|customMode)\b(?!['"])/g) || [];
if (legacyModeRefs.length) {
  throw new Error(`Legacy mode flags remain in game code: ${legacyModeRefs.join(', ')}`);
}
if (/isMode\('[^']+'\)\s*=/.test(gameCode)) {
  throw new Error('A mode predicate is being assigned to instead of using setActiveMode().');
}
const directStorageUses = html.match(/localStorage\.(?:getItem|setItem|removeItem)/g) || [];
if (directStorageUses.length !== 5) {
  throw new Error(`Expected only the five storage-boundary calls, found ${directStorageUses.length}.`);
}

const data = new Map([
  ['wake7-language', 'en'],
  ['wake7-sound', 'off'],
  ['wake7-active-lap', '2'],
  ['wake7-cleared', '[0,1]'],
  ['wake7-extra-cleared', '[3]'],
  ['wake7-satori-cleared', '[7]'],
  ['wake7-master-gold-granted', '1'],
  ['wake7-speed-intermediate-trial-cleared', '1'],
  ['wake7-active-session', JSON.stringify({mode:'mastery',extra:true,index:3,lap:2,board:{o:[0,0,0,0,0,0,0]}})]
]);
const localStorage = {
  getItem:key => data.has(key) ? data.get(key) : null,
  setItem:(key,value) => data.set(key, String(value))
};
const context = {window:{localStorage}, JSON};
context.window.window = context.window;
vm.runInNewContext(stateModule, context, {filename:'src/game-state.js'});
vm.runInNewContext(progressionModule, context, {filename:'src/progression-policy.js'});
const migrated = context.window.WakeSevenState.migrateLegacy(localStorage);
if (migrated.navigation.mode !== 'mastery' || migrated.navigation.masteryIndex !== 3 || migrated.navigation.lap !== 2) {
  throw new Error('Legacy navigation migration failed.');
}
if (migrated.settings.language !== 'en' || migrated.settings.sound !== false || migrated.progress.lap1.primary.join(',') !== '0,1') {
  throw new Error('Legacy settings or progress migration failed.');
}
if (!migrated.unlocks.masterGoldGranted || !migrated.unlocks.speedIntermediateTrialCleared) {
  throw new Error('Legacy unlock migration failed.');
}
if (!data.has('wake7-state-vnext')) throw new Error('Migration did not write wake7-state-vnext.');

const progression = context.window.WakeSevenProgression.create({
  satoriTotal:73,trainingExamTotal:18,
  academyTotal:20,developmentStart:12,developmentTotal:8,
  trainingStart:20,trainingTotal:27,basicStart:3
});
if (progression.speedModes.mastery15.total !== 18 || progression.speedModes.satori73.allowsUndo !== false) {
  throw new Error('Speed policy generation failed.');
}
if (!progression.canEnter('training',{lap:1,trials:{training:true}}) || progression.canEnter('satori',{lap:1,mastered:false,trials:{mastery:true}})) {
  throw new Error('Course gate policy failed.');
}
if (!progression.uiPolicy({mode:'stage',lap:1,stageIndex:3}).narrowRods
  || !progression.uiPolicy({mode:'stage',lap:1,stageIndex:12}).eliminateWrongRods
  || progression.uiPolicy({mode:'stage',lap:2,stageIndex:12}).eliminateWrongRods
  || !progression.uiPolicy({mode:'speed',lap:1,stageIndex:0,speedVariant:'training9'}).speedFalling) {
  throw new Error('Learning UI policy failed.');
}

console.log(`Validated ${inlineScripts.length} inline scripts and a legacy-to-vNext state migration.`);
