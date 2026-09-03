import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishedSourceFiles } from './application-manifest.mjs';

// トップレベルの可変状態を、用途ごとに追跡するための分類メタデータ。
// ここは実行時コードではなく、公開ソースを解析するための開発用メタデータである。
export const STATE_CATEGORIES = Object.freeze([
  'navigationState', 'boardState', 'progressState', 'dialogState',
  'animationState', 'sessionState', 'settingsState'
]);

// 名前は状態の所有責務を表す。曖昧なものはファイルの責務で補完する。
export const STATE_CLASSIFICATION = Object.freeze({
  navigationState: new Set('activeMode lastStageMode activeLap stageIndex extraIndex satoriIndex tutorialStep pickerLap pickerRound satoriPickerPage returnStageContext rankDialogReturn rankListLap messageDialogReturn masterDialogKind editingBoard'.split(' ')),
  boardState: new Set('ori spin history moves best tileEls baseTiles drag busy boardTouchActive currentInitialState currentInitialPar displayedMoves displayedRemaining fourthCheckUsage fourthHintPreview fourthDistanceRevealed fourthHintDistance fourthChecksUsed'.split(' ')),
  progressState: new Set('clearShown nextStageAttention pendingMasterThemeRefresh masterGoldGranted satoriDesignGranted secondLapActive awakenedGranted threeDUnlocked rainbowDarumaGranted secondLapUnlocked clearedStages clearedExtraStages clearedSatoriStages lap1ClearedStages lap1ClearedExtraStages lap1ClearedSatoriStages lap2ClearedStages lap2ClearedExtraStages lap2ClearedSatoriStages applicationTargetTiles guidedBasicCandidateTis guidedBasicCandidateSignature fallenRodTis'.split(' ')),
  dialogState: new Set('chainCleanup chainActiveStep chainActiveName chainHistory chainTransitioning progressionQuizContext returnToClearCard twoMovePatternsReturnTarget twoMoveDetailReturnTarget guideHubReturn tipGuideIndex tipGuideStates tipGuideDrag tipGuideReturnTarget messageReviewEntries messageReviewIndex twoMoveLessonTipIndex twoMoveLessonContext clearFlowState clearFlowPhase clearFlowCycle'.split(' ')),
  animationState: new Set('introRun academyWelcomeRun boardAnimationSession boardAnimationSequence tutorialRewindSessionSerial activeTutorialRewindSession namedAnimationGuardSerial'.split(' ')),
  sessionState: new Set('savedFreeSession speedVariant speedUiRefs speedSession speedClockStarted speedManuallyPaused speedViewRefs invalidGrabPointerId'.split(' ')),
  settingsState: new Set('soundEnabled boardTheme boardLayout boardThemeChosen boardLayoutChosen darumaColor darumaColorChosen savedLanguage'.split(' '))
});

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
const reportPath = join(reportDir, 'state-classification.json');
const baselinePath = join(root, 'scripts', 'state-classification-baseline.json');

// 文字列・コメントを除外しつつ、トップレベルの let/var 宣言だけを拾う軽量字句走査。
function masked(source) {
  let out = '', mode = 'code', quote = '', escaped = false;
  for (let i = 0; i < source.length; i += 1) {
    const c = source[i], n = source[i + 1];
    if (mode === 'line') { out += c === '\n' ? '\n' : ' '; if (c === '\n') mode = 'code'; continue; }
    if (mode === 'block') { out += c === '\n' ? '\n' : ' '; if (c === '*' && n === '/') { out += ' '; i += 1; mode = 'code'; } continue; }
    if (mode === 'string') { out += c === '\n' ? '\n' : ' '; if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === quote) mode = 'code'; continue; }
    if (c === '/' && n === '/') { out += '  '; i += 1; mode = 'line'; continue; }
    if (c === '/' && n === '*') { out += '  '; i += 1; mode = 'block'; continue; }
    if (c === '\'' || c === '"' || c === '`') { quote = c; mode = 'string'; out += ' '; continue; }
    out += c;
  }
  return out;
}
function topLevelDeclarations(source) {
  const text = masked(source), result = [], lineOf = offset => text.slice(0, offset).split('\n').length;
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '{') { depth += 1; continue; }
    if (text[i] === '}') { depth -= 1; continue; }
    if (depth !== 0) continue;
    const match = text.slice(i).match(/^(let|var)\s+([^;\n]+)/);
    if (!match) continue;
    const declaration = match[2];
    const parts = [];
    let part = '', nested = 0;
    for (const c of declaration) {
      if ('([{'.includes(c)) nested += 1;
      if (')]}'.includes(c)) nested -= 1;
      if (c === ',' && nested === 0) { parts.push(part); part = ''; } else part += c;
    }
    parts.push(part);
    for (const item of parts) {
      const name = item.trim().match(/^([A-Za-z_$][\w$]*)\s*(?:=|$)/)?.[1];
      if (name) result.push({ name, declaration: match[1], line: lineOf(i) });
    }
    i += match[0].length - 1;
  }
  return result.filter(item => typeof item === 'object');
}
function categoryFor(item) {
  const matches = STATE_CATEGORIES.filter(category => STATE_CLASSIFICATION[category].has(item.name));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return matches;
  if (/runtime\/settings|app-bootstrap/.test(item.file)) return 'settingsState';
  if (/board-(animation|interaction|render)|tutorial-animation/.test(item.file)) return 'animationState';
  if (/speed|session/.test(item.file)) return 'sessionState';
  if (/dialog|message|quiz|clear-flow/.test(item.file)) return 'dialogState';
  if (/progression|rank/.test(item.file)) return 'progressState';
  return 'boardState';
}

const states = [];
for (const file of publishedSourceFiles) {
  const source = await readFile(join(root, 'src', file), 'utf8');
  for (const declaration of topLevelDeclarations(source)) states.push({ ...declaration, file, category: categoryFor({ ...declaration, file }) });
}
const duplicateNames = Object.entries(Object.groupBy(states, item => item.name)).filter(([, items]) => items.length > 1).map(([name, items]) => ({ name, items }));
const overlaps = states.filter(item => Array.isArray(item.category));
const missing = states.filter(item => !STATE_CATEGORIES.includes(item.category));
const counts = Object.fromEntries(STATE_CATEGORIES.map(category => [category, states.filter(item => item.category === category).length]));
let baseline = null;
try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); } catch { /* 初回はbaselineなし */ }
const delta = baseline?.counts ? Object.fromEntries(STATE_CATEGORIES.map(category => [category, counts[category] - (baseline.counts[category] || 0)])) : null;
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), source: 'scripts/application-manifest.mjs:publishedSourceFiles', categories: STATE_CATEGORIES, counts, delta, duplicateNames, overlaps, missing, states };
await mkdir(reportDir, { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(`State classification: ${states.length} top-level mutable declarations; missing ${missing.length}, overlaps ${overlaps.length}, duplicate names ${duplicateNames.length}.`);
console.log(`Report: ${relative(root, reportPath)}`);
