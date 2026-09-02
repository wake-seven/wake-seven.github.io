import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const srcRoot = join(root, 'src');
const auditDoc = await readFile(join(root, 'docs', 'architecture-audit.md'), 'utf8');
for (const heading of ['# 現行アーキテクチャ案内']) {
  assert.match(auditDoc, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Compatibility audit documentation is missing: ${heading}`);
}
const sources = new Map();

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (['.js', '.mjs', '.html'].includes(extname(entry.name))) {
      sources.set(relative(root, path).replaceAll('\\', '/'), await readFile(path, 'utf8'));
    }
  }
}
await collect(srcRoot);

const manifest = await readFile(join(root, 'scripts', 'application-manifest.mjs'), 'utf8');
const publicHtml = await readFile(join(root, 'index.html'), 'utf8');
assert.ok(manifest.indexOf("state/game-state.js") < manifest.indexOf("runtime/namespace.js"), 'State API must initialize before the public namespace.');
assert.ok(manifest.indexOf("state/progression-policy.js") < manifest.indexOf("runtime/namespace.js"), 'Progression API must initialize before the public namespace.');
assert.match(sources.get('src/runtime/namespace.js'), /Object\.freeze\(\{state: stateApi, progression: progressionApi, messages: messagesApi, speed: speedApi\}\)/, 'Public API namespace must remain minimal and frozen.');
for (const [file, token] of [['src/state/game-state.js', 'WakeSevenState?.create'], ['src/state/progression-policy.js', 'WakeSevenProgression?.create'], ['src/runtime/namespace.js', 'WakeSeven?.state']]) {
  assert.match(sources.get(file), new RegExp(`global\\.${token.replace(/[.?]/g, '\\$&')}`), `Duplicate ${file} initialization must be guarded.`);
}

const all = [...sources.entries()].map(([file, source]) => `${file}\n${source}`).join('\n');
// 過去保存データ互換は提供しない。移行関数や旧並び替え識別子が復活したら失敗させる。
for (const token of ['migrateTutorialState', 'migrateSatoriOrder', 'LEGACY_SATORI_STAGES', 'speedUnlockModelVersion', 'speedTrialModelVersion', 'probability-2', 'optimal-path-5']) {
  assert.ok(!all.includes(token), `Removed compatibility token remains: ${token}`);
}
for (const token of ['satoriCatalogFromLegacy', 'boardQuizCatalogFromLegacy', 'messageCatalogFromLegacy']) {
  assert.ok(!all.includes(token), `Removed ESM legacy adapter remains: ${token}`);
}
for (const [file, token] of [
  ['src/ui/board-render.js', 'renderAxisGuide'],
  ['src/ui/tutorial-animation.js', 'startTutorialRewindSession'],
  ['src/ui/progression-render.js', 'renderClearShapeRuleContent'],
  ['src/ui/board-interaction.js', 'cancelBoardAnimation']
]) {
  assert.match(sources.get(file), new RegExp(`function ${token}\\(`), `Current boundary is missing: ${file}:${token}`);
  assert.match(publicHtml, new RegExp(`function ${token}\\(`), `Generated HTML is missing: ${file}:${token}`);
}
assert.match(sources.get('src/ui/dom.js'), /function setText/);
assert.match(sources.get('src/ui/dom.js'), /function createRefs/);
assert.match(sources.get('src/runtime/speed.js'), /speedViewRefs/);
assert.match(sources.get('src/ui/rank.js'), /setText\('rankDialogTitle'/);
const canonicalIds = ['training18', 'mastery27', 'satori73'];
for (const id of canonicalIds) assert.match(all, new RegExp(`['"]${id}['"]`), `Canonical speed id is missing: ${id}`);

const storageSource = sources.get('src/state/game-state.js');
assert.match(storageSource, /STORAGE_KEY\s*=\s*'wake7-state-vnext'/, 'Unified state storage key is missing.');
for (const group of ['navigation', 'board', 'progression', 'settings', 'speed', 'dialogs']) {
  assert.match(storageSource, new RegExp(`${group}\\s*:`), `Unified state section is missing: ${group}`);
}
assert.match(storageSource, /dialogs:\s*Object\.freeze\(\{[^}]*state:/, 'Dialog persistence keys are not grouped.');
for (const [file, source] of sources) {
  if (file === 'src/state/game-state.js') continue;
  assert.doesNotMatch(source, /\bSTORAGE_KEYS\./,
    `Flat persistence key reference remains outside STORAGE_KEY_GROUPS: ${file}`);
  assert.doesNotMatch(source, /storage\.(?:get|set|remove|json|setJson)\(\s*['"]wake7-[a-z0-9-]+['"]\s*(?:[,)]|$)/,
    `Direct persistence key remains outside STORAGE_KEY_GROUPS: ${file}`);
}
assert.doesNotMatch(storageSource, /global\.WakeSevenState\s*=\s*Object\.freeze\(\{[\s\S]*?STORAGE_KEYS\s*,/,
  'Flat STORAGE_KEYS must not be exposed through the public state API.');
const directStorage = all.match(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)/g) || [];
const localStorageCalls = all.match(/localStorage\.(?:getItem|setItem|removeItem)/g) || [];
const sessionStorageCalls = all.match(/sessionStorage\.(?:getItem|setItem|removeItem)/g) || [];
assert.equal(localStorageCalls.length, 0, `State boundary storage calls changed: ${localStorageCalls.length}`);
assert.equal(sessionStorageCalls.length, 2, `Analytics session storage calls changed: ${sessionStorageCalls.length}`);

// 開始→チュートリアル→盤面操作を支えるDOM契約。文言変更には影響せず、要素の消失だけを検出する。
const template = sources.get('src/index.template.html');
for (const id of ['introDialog', 'introStart', 'tutorialReset', 'board', 'boardGuidance', 'reset', 'undo']) {
  assert.match(template, new RegExp(`id=["']${id}["']`), `Main flow DOM contract is missing: ${id}`);
}
for (const id of ['clearNext', 'speedBoardStart', 'masterStart', 'speedPause']) {
  assert.match(template, new RegExp(`id=["']${id}["']`), `Completion/speed DOM contract is missing: ${id}`);
}
for (const id of ['rankBadge', 'stagePickerRankBadge', 'master-road-step-template', 'chain-template-academy-board', 'chain-template-training-welcome']) {
  assert.match(template, new RegExp(`(?:id|id)=?["']${id}["']`), `Rank/dialog template contract is missing: ${id}`);
}
assert.match(template, /<template[^>]+id=["']chain-template-development-four-start["']/i, 'Milestone dialog template is missing.');
assert.match(sources.get('src/ui/board-ui.js'), /chain-template-development-four-start/);
assert.match(sources.get('src/ui/board-ui.js'), /content\.cloneNode\(true\)/);
for (const id of ['chain-template-academy-board', 'chain-template-training-welcome']) {
  assert.match(template, new RegExp(`<template[^>]+id=["']${id}["']`, 'i'), `Start dialog template is missing: ${id}`);
}
assert.match(template, /<template[^>]+id=["']master-road-step-template["']/i, 'Master roadmap template is missing.');
assert.match(sources.get('src/ui/progression-render.js'), /master-road-step-template/);
assert.match(sources.get('src/ui/progression-render.js'), /content\.cloneNode\(true\)/);
assert.match(template, /<template[^>]+id=["']rank-list-row-template["']/i, 'Rank list template is missing.');
assert.match(sources.get('src/ui/rank.js'), /rank-list-row-template/);
assert.match(sources.get('src/ui/rank.js'), /content\.cloneNode\(true\)/);
assert.match(template, /<template[^>]+id=["']message-cheer-caption-template["']/i, 'Message illustration template is missing.');
assert.match(sources.get('src/ui/message.js'), /message-cheer-caption-template/);
for (const id of ['message-intro-guide-frame-template', 'message-two-move-lesson-frame-template']) {
  assert.match(template, new RegExp(`<template[^>]+id=["']${id}["']`, 'i'), `Message board frame template is missing: ${id}`);
}
assert.match(sources.get('src/ui/message.js'), /message-intro-guide-frame-template/);
assert.match(sources.get('src/ui/message.js'), /message-two-move-lesson-frame-template/);
assert.match(sources.get('src/ui/message.js'), /function messageReviewView\(\)\{const refs=createRefs/);
// クリア後メッセージは、クリア情報・節目情報のどちらからでも同じ見直し導線へ入れる。
assert.match(sources.get('src/ui/message.js'), /function buildMessageReviewEntries\(\)/, 'Clear-message review aggregation is missing.');
assert.match(sources.get('src/ui/message.js'), /MILESTONE_RENDERERS/, 'Milestone message renderer registry is missing.');
for (const id of ['stage-picker-row-template', 'two-move-card-template']) {
  assert.match(template, new RegExp(`<template[^>]+id=["']${id}["']`, 'i'), `List template is missing: ${id}`);
}
for (const id of ['rankBadge', 'stagePickerRankBadge']) {
  assert.match(template, new RegExp(`<button[^>]+id=["']${id}["']`, 'i'), `Rank badge shell is missing: ${id}`);
}
const progressionUiSources=sources.get('src/ui/progression-insights.js')+'\n'+sources.get('src/ui/progression-ui.js');
assert.match(progressionUiSources, /stage-picker-row-template/);
assert.match(progressionUiSources, /two-move-card-template/);
assert.match(progressionUiSources, /clearedMasteryIndex/);
assert.match(progressionUiSources, /currentLapPrimaryComplete/);
assert.match(sources.get('src/runtime/speed.js'), /const trialVariant=\(speedSession\?\.requiredTrial/);
assert.match(sources.get('src/ui/progression-render.js'), /if\(stateClass\)step\.classList\.add\(stateClass\)/);
for (const id of ['chain-template-training-middle-spin', 'chain-template-development-welcome-spin']) {
  assert.match(template, new RegExp(`<template[^>]+id=["']${id}["']`, 'i'), `Spin dialog template is missing: ${id}`);
}
assert.match(template, /<template[^>]+id=["']chain-template-academy-enroll["']/i, 'Academy enroll template is missing.');
assert.match(sources.get('src/ui/board-ui.js'), /chain-template-academy-enroll/);
for (const token of ['startTutorial', 'rollOnce', 'tutorialStep', 'paint()']) {
  assert.match(all, new RegExp(token.replace(/[()]/g, '\\$&')), `Main flow implementation token is missing: ${token}`);
}
for (const token of [
  "$('introStart').addEventListener('click'",
  "svg.addEventListener('pointerdown'",
  "svg.addEventListener('pointerup'",
  "$('tutorialReset').addEventListener('click'"
]) {
  assert.match(all, new RegExp(token.replace(/[()$']/g, '\\$&')), `Main flow event binding is missing: ${token}`);
}
for (const token of [
  "$('reset').addEventListener('click'",
  "$('undo').addEventListener('click'",
  'startTutorial()',
  'history.pop()'
]) {
  assert.match(all, new RegExp(token.replace(/[()$']/g, '\\$&')), `Play-flow recovery action is missing: ${token}`);
}
const introStartAt = all.indexOf("$('introStart').addEventListener('click'");
const tutorialStartAt = all.indexOf('startTutorial()', introStartAt);
assert.ok(introStartAt >= 0 && tutorialStartAt > introStartAt, 'Start button must lead into tutorial initialization.');
for (const token of [
  'loadTutorialStep(',
  'STORAGE_KEY_GROUPS.progression.tutorialStep',
  'beginSecondLap()',
  'activateCampaignLap(2)',
  'secondLapIntro',
  'pauseSpeedRun()',
  'persistSpeedSession()',
  'speedSessionStorageKey('
]) {
  assert.match(all, new RegExp(token.replace(/[()$']/g, '\\$&')), `Resume/transition regression contract is missing: ${token}`);
}
for (const token of [
  'loadTutorialStep(',
  'loadStage(',
  'showClearDialog(',
  'completeSpeedStage(',
  'advanceSpeedRun(',
  "WakeSevenEventBindings.click('clearNext'"
]) {
  assert.match(all, new RegExp(token.replace(/[()$']/g, '\\$&')), `Campaign/speed completion flow is missing: ${token}`);
}

// 固定構造のテンプレート欠落fallbackは持たない。
const fallbackAssignments = [];
for (const [file, source] of sources) {
  source.split(/\r?\n/).forEach((line, index) => {
    if (/body\.innerHTML\s*=\s*fallback\b/.test(line)) {
      fallbackAssignments.push({ location: `${file}:${index + 1}`, file, line: line.trim() });
    }
  });
}
if (fallbackAssignments.length) throw new Error(`Ordinary-HTML fallbacks remain: ${fallbackAssignments.map(item => item.location).join(', ')}`);

// 宣言一回・参照一回の関数は削除候補として報告するだけに留める。
const candidates = [];
for (const [file, source] of sources) {
  for (const [, name] of source.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    const references = (all.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
    if (references === 1) candidates.push(`${file}:${name}`);
  }
}
// 呼び出し回数だけでは判定できない公開境界・初期化入口を分類する。
// これらは公開版のインラインスクリプトや開発用ESMの入口であり、
// 通常の未使用候補として扱わない。
const boundaryRoles = new Map([
  ['src/main.mjs:createDevelopmentRuntime', 'development-entrypoint'],
  ['src/runtime/namespace.js:attachWakeSevenNamespace', 'public-namespace-initializer'],
  ['src/state/game-state.js:attachWakeSevenState', 'public-state-initializer'],
  ['src/state/progression-policy.js:attachWakeSevenProgression', 'public-progression-initializer']
]);
const ordinaryCandidates = candidates.filter(candidate => !boundaryRoles.has(candidate));
const boundaryCandidates = candidates.filter(candidate => boundaryRoles.has(candidate));
console.log(`Audited canonical speed ids (${canonicalIds.join(', ')}) and ${sources.size} source files.`);
console.log(`Storage boundary calls: localStorage=${localStorageCalls.length}, sessionStorage=${sessionStorageCalls.length}.`);
console.log('Ordinary-HTML compatibility fallbacks: none.');
console.log(`Public boundary candidates (classified, not unused): ${boundaryCandidates.length}.`);
if (boundaryCandidates.length) console.log(boundaryCandidates.map(candidate => `${candidate} [${boundaryRoles.get(candidate)}]`).join(', '));
console.log(`Potential ordinary unused function candidates (review only): ${ordinaryCandidates.length}.`);
if (ordinaryCandidates.length) console.log(ordinaryCandidates.slice(0, 30).join(', '));

// 公開版で公開する最小APIの形状を静的に確認する。
const namespaceSource = sources.get('src/runtime/namespace.js');
assert.match(namespaceSource, /global\.WakeSeven\s*=\s*Object\.freeze\(\{\s*state:\s*stateApi,\s*progression:\s*progressionApi,\s*messages:\s*messagesApi,\s*speed:\s*speedApi\s*\}\)/, 'WakeSeven public namespace shape is missing.');
for (const api of ['stateApi', 'progressionApi', 'messagesApi', 'speedApi']) {
  assert.match(namespaceSource, new RegExp(`const ${api}\\s*=\\s*Object\\.freeze\\(`), `WakeSeven API must be immutable: ${api}`);
}
for (const property of ['current', 'navigation', 'settings', 'progress', 'persist', 'updateNavigation', 'updateSettings']) {
  assert.match(namespaceSource, new RegExp(`\\b${property}\\b`), `WakeSeven.state API is missing: ${property}`);
}
for (const property of ['definition', 'context', 'uiPolicy']) {
  assert.match(namespaceSource, new RegExp(`\\b${property}\\b`), `WakeSeven.progression API is missing: ${property}`);
}
for (const property of ['openReview', 'renderReview', 'entries']) {
  assert.match(namespaceSource, new RegExp(`\\b${property}\\b`), `WakeSeven.messages API is missing: ${property}`);
}
for (const property of ['pause', 'startClock', 'pauseClock', 'definitions']) {
  assert.match(namespaceSource, new RegExp(`\\b${property}\\b`), `WakeSeven.speed API is missing: ${property}`);
}
assert.match(sources.get('src/main.mjs'), /export function createDevelopmentRuntime\s*\(/, 'Development ESM entry point is missing.');
assert.match(sources.get('src/state/game-state.js'), /global\.WakeSevenState\s*=\s*Object\.freeze\(/, 'WakeSevenState initializer is missing.');
assert.match(sources.get('src/state/progression-policy.js'), /global\.WakeSevenProgression\s*=\s*Object\.freeze\(/, 'WakeSevenProgression initializer is missing.');
