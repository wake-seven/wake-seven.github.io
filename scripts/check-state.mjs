import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const html = await readFile(join(root, 'index.html'), 'utf8');
const stateModule = await readFile(join(root, 'src', 'game-state.js'), 'utf8');
const progressionModule = await readFile(join(root, 'src', 'progression-policy.js'), 'utf8');
const coreDataModule = await readFile(join(root, 'src', 'core-data.js'), 'utf8');
const runtimeModule = await readFile(join(root, 'src', 'runtime.js'), 'utf8');
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
  '// ===== 盤面クイズデータ =====',
  'function buildMessageReviewEntries()',
  'function boardQuizPatternState('
];
const missing = required.filter(token => !html.includes(token));
if (missing.length) throw new Error(`index.html is missing: ${missing.join(', ')}`);

const moduleMarkers = [
  '// ===== クリア後メッセージデータ =====',
  '// ===== 基礎データ =====',
  '// ===== 悟り出題データ =====',
  '// ===== 多言語UIテキスト =====',
  '// ===== 盤面クイズデータ =====',
  '// ===== 固定挿絵・SVGデータ =====',
  '// ===== 実行設定 =====',
  '// ===== サウンド =====',
  '// ===== 実行状態 =====',
  '// ===== スピードラン(速解き)ランタイム =====',
  '// ===== 盤面アニメーション補助 =====',
  '// ===== 盤面UI =====',
  '// ===== クイズUI =====',
  '// ===== クリアフロー =====',
  '// ===== メッセージUI =====',
  '// ===== 進行表示 =====',
  '// ===== 節目ダイアログ =====',
  '// ===== 進行UI =====',
  '// ===== イベントと起動 ====='
];
const markerPositions = moduleMarkers.map(marker => html.indexOf(marker));
if (markerPositions.some(position => position < 0)
  || markerPositions.some((position, index) => index > 0 && position <= markerPositions[index - 1])) {
  throw new Error('Application modules are missing or out of order in generated index.html.');
}

// コースの基準値は複数の画面・解放条件から参照されるため、宣言同士の整合性を静的に確認する。
const declaredExpressions = new Map([...coreDataModule.matchAll(/const\s+([A-Z][A-Z0-9_]*)\s*=\s*([^;]+);/g)]
  .map(([, name, expression]) => [name, expression.trim()]));
const declaredNumbers = new Map();
for (let pass = 0; pass < declaredExpressions.size; pass++) {
  let changed = false;
  for (const [name, expression] of declaredExpressions) {
    if (declaredNumbers.has(name) || !/^[0-9A-Z_ +*()/.-]+$/.test(expression)) continue;
    const identifiers = expression.match(/[A-Z][A-Z0-9_]*/g) || [];
    if (identifiers.some(identifier => !declaredNumbers.has(identifier))) continue;
    const resolved = expression.replace(/[A-Z][A-Z0-9_]*/g, identifier => String(declaredNumbers.get(identifier)));
    try {
      const value = Function(`return ${resolved};`)();
      if (Number.isFinite(value)) { declaredNumbers.set(name, value); changed = true; }
    } catch { /* 式として評価できない宣言は対象外 */ }
  }
  if (!changed) break;
}
const expectedCourseCounts = {
  INTRO_STAGE_COUNT: 3,
  BASIC_STAGE_COUNT: 9,
  DEVELOPMENT_STAGE_COUNT: 8,
  ACADEMY_STAGE_COUNT: 20,
  TRAINING_STAGE_COUNT: 27,
  TRAINING_UPPER_COUNT: 9,
  TRAINING_MIDDLE_COUNT: 9,
  TRAINING_LOWER_COUNT: 9,
  MASTER_VOLUME_SIZE: 15
};
for (const [name, expected] of Object.entries(expectedCourseCounts)) {
  if (declaredNumbers.get(name) !== expected) {
    throw new Error(`${name} is inconsistent: expected ${expected}, found ${declaredNumbers.get(name)}.`);
  }
}
if (declaredNumbers.get('ACADEMY_STAGE_COUNT') !== declaredNumbers.get('DEVELOPMENT_STAGE_START') + declaredNumbers.get('DEVELOPMENT_STAGE_COUNT')
  || declaredNumbers.get('TRAINING_STAGE_COUNT') !== declaredNumbers.get('TRAINING_UPPER_COUNT') + declaredNumbers.get('TRAINING_MIDDLE_COUNT') + declaredNumbers.get('TRAINING_LOWER_COUNT')) {
  throw new Error('Course count formulas are inconsistent.');
}
const primarySectionBlock = runtimeModule.match(/const PRIMARY_SECTIONS=Object\.freeze\(\[(.*?)\]\);/s)?.[1] || '';
const sectionTotals = [...primarySectionBlock.matchAll(/total:([A-Z][A-Z0-9_]*)/g)].map(([, name]) => declaredNumbers.get(name));
if (sectionTotals.length !== 6 || sectionTotals.some(value => !Number.isFinite(value))
  || sectionTotals.reduce((sum, value) => sum + value, 0) !== declaredNumbers.get('ACADEMY_STAGE_COUNT') + declaredNumbers.get('TRAINING_STAGE_COUNT')) {
  throw new Error('PRIMARY_SECTIONS totals do not match the academy and training course counts.');
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
  ['src/data-board-quiz.js', ['const BOARD_QUIZ_COPY=']],
  ['src/data-satori.js', ['const SATORI_STAGES=', "const SATORI_ORDER_VERSION='"]],
  ['src/data-assets.js', ['academyEnrollArtSvg']],
  ['src/runtime-settings.js', ['initializeRuntimeSettings']],
  ['src/runtime-audio.js', ['playTone', 'playClearSound']],
  ['src/quiz-ui.js', ['boardQuizPatternState', 'boardQuizPresentation', 'boardQuizMarkup', 'bindBoardQuizAnswerEvents']],
  ['src/clear-flow.js', ['stageClearTextAt', 'clearEntryForCurrent', 'stageClearArtAt']],
  ['src/message-ui.js', ['buildMessageReviewEntries', 'openMessageReview', 'moveMessageReview']],
  ['src/progression-render.js', ['renderStageNavAccent']],
  ['src/master-dialog.js', ['masterDialogTrialState', 'masterDialogBoardTheme', 'masterDialogBoardOptions']],
  ['src/progression-ui.js', ['showClearDialog', 'renderClearTip']]
];
for (const [moduleName, names] of sourceModules) {
  const moduleSource = await readFile(join(root, moduleName), 'utf8');
  for (const name of names) {
    const token = name.startsWith('const ') ? name : `function ${name}(`;
    if (!moduleSource.includes(token)) {
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

const makeStorage = entries => {
  const data = new Map(Object.entries(entries));
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
    has: key => data.has(key)
  };
};
const localStorage = makeStorage({
  'wake7-language': 'en',
  'wake7-sound': 'off',
  'wake7-active-lap': '2',
  'wake7-cleared': '[0,1]',
  'wake7-extra-cleared': '[3]',
  'wake7-satori-cleared': '[7]',
  'wake7-master-gold-granted': '1',
  'wake7-speed-intermediate-trial-cleared': '1',
  'wake7-active-session': JSON.stringify({mode:'mastery',extra:true,index:3,lap:2,board:{o:[0,0,0,0,0,0,0]}})
});
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
if (!localStorage.has('wake7-state-vnext')) throw new Error('Migration did not write wake7-state-vnext.');

const migrationFixtures = [
  {
    name: 'settings, lap2 progress, and stage session',
    entries: {
      'wake7-language': 'zh', 'wake7-sound': 'on', 'wake7-board-theme': 'night',
      'wake7-board-layout': 'wide', 'wake7-daruma-color': 'gold', 'wake7-active-lap': '2',
      'wake7-lap2-primary-cleared': '[2,5]',
      'wake7-active-session': JSON.stringify({mode:'stage',index:8,board:{o:[1,2,0,1,2,0,1]}})
    },
    verify: state => {
      if (state.navigation.mode !== 'stage' || state.navigation.stageIndex !== 8 || state.navigation.lap !== 2)
        throw new Error('Fixture stage navigation migration failed.');
      if (state.progress.lap2.primary.join(',') !== '2,5') throw new Error('Fixture lap2 progress migration failed.');
      if (state.settings.language !== 'zh' || state.settings.sound !== true || state.settings.boardTheme !== 'night'
        || state.settings.boardLayout !== 'wide' || state.settings.darumaColor !== 'gold')
        throw new Error('Fixture settings migration failed.');
    }
  },
  {
    name: 'mastery session and speed trial',
    entries: {
      'wake7-active-lap': '1', 'wake7-extra-cleared': '[1,4]',
      'wake7-speed-active-variant': 'mastery15',
      'wake7-speed-mastery-unlocked': '1', 'wake7-speed-mastery-trial-cleared': '1',
      'wake7-active-session': JSON.stringify({mode:'mastery',extra:true,index:4,board:{o:[0,1,2,0,1,2,0]}})
    },
    verify: state => {
      if (state.navigation.mode !== 'mastery' || state.navigation.masteryIndex !== 4)
        throw new Error('Fixture mastery navigation migration failed.');
      if (state.progress.lap1.mastery.join(',') !== '1,4') throw new Error('Fixture mastery progress migration failed.');
      if (state.speed.activeVariant !== 'mastery15' || !state.unlocks.speedMastery
        || !state.unlocks.speedMasteryTrialCleared)
        throw new Error('Fixture speed migration failed.');
    }
  }
];
for (const fixture of migrationFixtures) {
  const fixtureStorage = makeStorage(fixture.entries);
  const migratedFixture = context.window.WakeSevenState.migrateLegacy(fixtureStorage);
  fixture.verify(migratedFixture);
  if (!fixtureStorage.has('wake7-state-vnext')) {
    throw new Error(`Fixture ${fixture.name} did not write wake7-state-vnext.`);
  }
}

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
