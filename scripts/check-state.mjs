import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const html = await readFile(join(root, 'index.html'), 'utf8');
const stateModule = await readFile(join(root, 'src', 'state', 'game-state.js'), 'utf8');
const progressionModule = await readFile(join(root, 'src', 'state', 'progression-policy.js'), 'utf8');
const boardDomainModule = await readFile(join(root, 'src', 'domain', 'board-domain.js'), 'utf8');
const coreDataModule = await readFile(join(root, 'src', 'data', 'core-data.js'), 'utf8');
const runtimeModule = await readFile(join(root, 'src', 'runtime', 'runtime.js'), 'utf8');
const namespaceModule = await readFile(join(root, 'src', 'runtime', 'namespace.js'), 'utf8');
const compatCleanupDoc = await readFile(join(root, 'docs', 'compat-cleanup.md'), 'utf8');
const satoriDataModule = await readFile(join(root, 'src', 'data', 'satori.js'), 'utf8');
const boardQuizDataModule = await readFile(join(root, 'src', 'data', 'board-quiz.js'), 'utf8');
// classic互換ソースをvmで単体検査する際は、公開module境界だけを除去する。
const forClassicVm = source => source.replace(/^\s*export\s*\{\s*\};?\s*$/gm, '');
const required = [
  'WAKE7:STATE-MODULE:START',
  'WAKE7:PROGRESSION-POLICY:START',
  'WAKE7:APPLICATION-MODULES:START',
  'wake7-state-vnext',
  'WakeSevenProgression',
  'window.WakeSeven',
  'stateApi',
  'progressionApi',
  'messagesApi',
  'speedApi',
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
const moduleScriptCount = (html.match(/<script\s+type="module">/g) || []).length;
if (moduleScriptCount !== 1 || html.includes('window.eval(')) {
  throw new Error('Published index.html must contain exactly one native module script without eval.');
}
const compatSections = [
  '# 互換層の段階的削除計画',
  '## 判定基準',
  '## 互換モード名・フラグ',
  '## 保存形式',
  '## 未使用データ・翻訳',
  '## 削除前チェックリスト'
];
const missingCompatSections = compatSections.filter(token => !compatCleanupDoc.includes(token));
if (missingCompatSections.length) {
  throw new Error(`Compatibility cleanup inventory is incomplete: ${missingCompatSections.join(', ')}`);
}

const moduleMarkers = [
  '// ===== 盤面ドメイン =====',
  '// ===== クリア後メッセージデータ =====',
  '// ===== 基礎データ =====',
  '// ===== 悟り出題データ =====',
  '// ===== 多言語UIテキスト =====',
  '// ===== 盤面クイズデータ =====',
  '// ===== 固定挿絵・SVGデータ =====',
  '// ===== 実行設定 =====',
  '// ===== サウンド =====',
  '// ===== 速解き解放状態 =====',
  '// ===== 実行状態 =====',
  '// ===== スピードラン(速解き)ランタイム =====',
  '// ===== 盤面アニメーション補助 =====',
  '// ===== 盤面UI =====',
  '// ===== 盤面コマンド =====',
  '// ===== 進行コマンド =====',
  '// ===== クイズUI =====',
  '// ===== クリアフロー =====',
  '// ===== メッセージUI =====',
  '// ===== 進行表示 =====',
  '// ===== 節目ダイアログ =====',
  '// ===== 進行UI =====',
  '// ===== SVG表示境界 =====',
  '// ===== 画面描画境界 =====',
  '// ===== イベントと起動 =====',
  '// ===== 公開API名前空間 ====='
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
if (!html.includes('const WakeSevenBoardCommands=Object.freeze(')
  || !html.includes('WakeSevenBoardCommands.applySwipe')
  || !html.includes('WakeSevenBoardCommands.undo()')) {
  throw new Error('Board input handlers must use WakeSevenBoardCommands.');
}
if (!html.includes('const WakeSevenProgressionCommands=Object.freeze(')
  || !html.includes('WakeSevenProgressionCommands.startSpeedRun')
  || !html.includes('WakeSevenProgressionCommands.advanceSpeedRun')) {
  throw new Error('Progression input handlers must use WakeSevenProgressionCommands.');
}

const sourceModules = [
  ['src/domain/board-domain.js', ['const WakeSevenBoardDomain=']],
  ['src/data/board-quiz.js', ['const BOARD_QUIZ_COPY=']],
  ['src/data/satori.js', ['const SATORI_STAGES=', "const SATORI_ORDER_VERSION='"]],
  ['src/data/assets.js', ['academyEnrollArtSvg']],
  ['src/runtime/settings.js', ['initializeRuntimeSettings']],
  ['src/runtime/audio.js', ['playTone', 'playClearSound']],
  ['src/runtime/progression-runtime.js', ['initializeSpeedUnlockState']],
  ['src/ui/quiz.js', ['boardQuizPatternState', 'boardQuizPresentation', 'boardQuizMarkup', 'bindBoardQuizAnswerEvents']],
  ['src/commands/board-commands.js', ['const WakeSevenBoardCommands=Object.freeze(']],
  ['src/commands/progression-commands-legacy.js', ['const WakeSevenProgressionCommands=Object.freeze(']],
  ['src/ui/clear-flow.js', ['stageClearTextAt', 'clearEntryForCurrent', 'stageClearArtAt']],
  ['src/ui/message.js', ['buildMessageReviewEntries', 'openMessageReview', 'moveMessageReview']],
  ['src/ui/progression-render.js', ['renderStageNavAccent']],
  ['src/ui/master-dialog.js', ['masterDialogTrialState', 'masterDialogBoardTheme', 'masterDialogBoardOptions']],
  ['src/ui/progression-ui.js', ['showClearDialog', 'renderClearTip']],
  ['src/ui/rank.js', ['rankFrameSvg', 'renderRankList', 'openRankDialog']],
  ['src/ui/render.js', ['renderCurrentView']]
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

// 大きなデータを処理側へ戻さないための境界検査。順序変更は保存済み進行に影響するので、
// SATORI_STAGES の最終化処理とバージョンを同じデータモジュール内に固定する。
for (const token of [
  'const SATORI_STAGES=[...SATORI_MIXED_STAGES];',
  "const SATORI_ORDER_VERSION='",
  'const satoriStageIndexByState=new Map(SATORI_STAGES.map('
]) {
  if (!satoriDataModule.includes(token)) throw new Error(`src/data/satori.js is missing ${token}`);
}
const quizLocales = [...boardQuizDataModule.matchAll(/^\s{2}(ja|en|zh|ko):\{/gm)].map(([, locale]) => locale);
if (quizLocales.length !== 4 || new Set(quizLocales).size !== 4
  || !['ja', 'en', 'zh', 'ko'].every(locale => quizLocales.includes(locale))) {
  throw new Error(`BOARD_QUIZ_COPY must define exactly ja/en/zh/ko locales: ${quizLocales.join(', ')}.`);
}
const namespaceSourceTokens = [
  'global.WakeSeven = Object.freeze',
  'const stateApi = Object.freeze',
  'const progressionApi = Object.freeze',
  'const messagesApi = Object.freeze',
  'const speedApi = Object.freeze'
];
for (const token of namespaceSourceTokens) {
  if (!namespaceModule.includes(token)) throw new Error(`src/runtime/namespace.js is missing ${token}.`);
}

// native module scriptはNodeのFunctionコンストラクタでは評価できないため、
// classicなインライン補助スクリプトだけを構文検査する。
const inlineScripts = [...html.matchAll(/<script(?![^>]*\btype=["']module["'])(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);
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

// ナビゲーションの実行時ミラーは段階移行中の互換層として残している。
// ただし、モード変更だけは必ずFacadeで正規化してからミラーへ反映する。
// この検査で、将来の変更がFacadeを迂回する直接代入を増やさないようにする。
const runtimeActiveModeAssignments = runtimeModule.match(/\bactiveMode\s*=(?!=)/g) || [];
if (runtimeActiveModeAssignments.length !== 2
  || !/function setActiveMode\(mode\)\{[\s\S]*?WakeSevenState\.updateNavigation\([\s\S]*?\)\;[\s\S]*?activeMode\s*=/.test(runtimeModule)) {
  throw new Error('activeMode must be initialized once and updated through WakeSevenState.updateNavigation().');
}
for (const name of ['navigationView', 'updateNavigation', 'updateSettings', 'updateProgress']) {
  if (!stateModule.includes(`function ${name}(`)) {
    throw new Error(`WakeSevenState is missing the ${name} facade API.`);
  }
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
vm.runInNewContext(forClassicVm(stateModule), context, {filename:'src/state/game-state.js'});
vm.runInNewContext(forClassicVm(progressionModule), context, {filename:'src/state/progression-policy.js'});
vm.runInNewContext(`${forClassicVm(boardDomainModule)}\nwindow.WakeSevenBoardDomain=WakeSevenBoardDomain;`, context, {filename:'src/domain/board-domain.js'});
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

const boardDomain = context.window.WakeSevenBoardDomain;
if (!boardDomain || typeof boardDomain.create !== 'function') throw new Error('Board domain API is unavailable.');
const domain = boardDomain.create({cellCount: 7, triangles: [{cells: [0, 1, 2]}]});
const sampleBoard = Uint8Array.from([0, 1, 2, 0, 1, 2, 1]);
const encoded = domain.encode(sampleBoard);
if (domain.stateCount !== 2187 || Array.from(domain.decode(encoded)).join(',') !== Array.from(sampleBoard).join(',')) {
  throw new Error('Board encode/decode round trip failed.');
}
const rolled = domain.roll(sampleBoard, 0, 1);
if (Array.from(domain.roll(rolled, 0, -1)).join(',') !== Array.from(sampleBoard).join(',')) {
  throw new Error('Board roll inverse failed.');
}
const clicked = domain.click(sampleBoard, 0, 1);
if (Array.from(domain.click(clicked, 0, -1)).join(',') !== Array.from(sampleBoard).join(',')) {
  throw new Error('Board click inverse failed.');
}
const swiped = domain.swipe(sampleBoard, 0, 1);
if (Array.from(domain.swipe(swiped, 0, -1)).join(',') !== Array.from(sampleBoard).join(',')) {
  throw new Error('Board swipe inverse failed.');
}
// 公開APIは生成HTMLに埋め込まれた実行時の入口でもあるため、形状と凍結状態を機械検証する。
const namespaceContext = {
  window: {},
  gameState: {settings: {}, progress: {}},
  WakeSevenState: {navigationView: () => ({}), updateNavigation: () => {}, updateSettings: () => {}},
  PROGRESSION: {uiPolicy: () => ({})},
  getGameContext: () => ({}),
  openMessageReview: () => {},
  renderMessageReview: () => {},
  messageReviewEntries: [],
  pauseSpeedRun: () => {},
  startSpeedClock: () => {},
  pauseSpeedClock: () => {},
  SPEED_MODE_DEFINITIONS: {}
};
vm.runInNewContext(forClassicVm(namespaceModule), namespaceContext, {filename:'src/runtime/namespace.js'});
const wakeSeven = namespaceContext.window.WakeSeven;
if (!wakeSeven || !Object.isFrozen(wakeSeven)
  || Object.keys(wakeSeven).sort().join(',') !== 'messages,progression,speed,state') {
  throw new Error('WakeSeven namespace shape or freeze state is invalid.');
}
for (const [name, expectedKeys] of Object.entries({
  state: ['current', 'navigation', 'progress', 'settings', 'persist', 'updateNavigation', 'updateSettings'],
  progression: ['definition', 'context', 'uiPolicy'],
  messages: ['entries', 'openReview', 'renderReview'],
  speed: ['definitions', 'pause', 'pauseClock', 'startClock']
})) {
  const api = wakeSeven[name];
  if (!Object.isFrozen(api) || expectedKeys.some(key => !(key in api))) {
    throw new Error(`WakeSeven.${name} API shape or freeze state is invalid.`);
  }
}
if (wakeSeven.state.current !== namespaceContext.gameState
  || wakeSeven.state.settings !== namespaceContext.gameState.settings
  || wakeSeven.progression.definition !== namespaceContext.PROGRESSION
  || wakeSeven.speed.definitions !== namespaceContext.SPEED_MODE_DEFINITIONS) {
  throw new Error('WakeSeven namespace getters do not expose runtime state.');
}
const solved = domain.buildSolver('roll');
if (solved.dist.length !== domain.stateCount || solved.dist[0] !== 0
  || solved.dist[domain.encode(Uint8Array.from([1, 1, 1, 0, 0, 0, 0]))] === 255) {
  throw new Error('Board roll solver validation failed.');
}

const stateApi = context.window.WakeSevenState;
const state = stateApi.create({navigation: {mode: 'stage', lap: 1}});
let stateChange = null;
const unsubscribe = stateApi.subscribe(state, (_, change) => { stateChange = change; });
stateApi.updateNavigation(state, {mode: 'invalid', lap: 2, stageIndex: 4});
if (state.navigation.mode !== 'stage' || state.navigation.lap !== 2 || state.navigation.stageIndex !== 4
  || stateChange?.section !== 'navigation') throw new Error('State navigation command validation failed.');
stateApi.updateBoard(state, {o: [1, 2, 0]});
if (state.board?.o?.join(',') !== '1,2,0') throw new Error('State board command validation failed.');
unsubscribe();
stateApi.write(state, localStorage);
const restored = stateApi.read(localStorage);
if (!restored || restored.navigation.stageIndex !== 4 || restored.board?.o?.join(',') !== '1,2,0') {
  throw new Error('State store write/read validation failed.');
}

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
      'wake7-speed-active-variant': 'training18',
      'wake7-speed-mastery-unlocked': '1', 'wake7-speed-mastery-trial-cleared': '1',
      'wake7-active-session': JSON.stringify({mode:'mastery',extra:true,index:4,board:{o:[0,1,2,0,1,2,0]}})
    },
    verify: state => {
      if (state.navigation.mode !== 'mastery' || state.navigation.masteryIndex !== 4)
        throw new Error('Fixture mastery navigation migration failed.');
      if (state.progress.lap1.mastery.join(',') !== '1,4') throw new Error('Fixture mastery progress migration failed.');
      if (state.speed.activeVariant !== 'training18' || !state.unlocks.speedMastery
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
if (progression.speedModes.training18.total !== 18 || progression.speedModes.mastery27.total !== 27 || progression.speedModes.satori73.allowsUndo !== false
  || Object.keys(progression.speedModes).some(id => !['standard','training9','training18','mastery27','satori73'].includes(id))) {
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
