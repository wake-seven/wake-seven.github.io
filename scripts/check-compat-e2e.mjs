import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const srcRoot = join(root, 'src');
const auditDoc = await readFile(join(root, 'docs', 'compat-audit.md'), 'utf8');
for (const heading of ['# 互換層・未使用候補監査', '## 速解きID', '## 互換キー']) {
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

const all = [...sources.entries()].map(([file, source]) => `${file}\n${source}`).join('\n');
assert.match(sources.get('src/ui/dom.js'), /function setText/);
assert.match(sources.get('src/ui/template.js'), /function mountTemplate/);
assert.match(sources.get('src/ui/dom.js'), /function createRefs/);
assert.match(sources.get('src/runtime/speed.js'), /speedViewRefs/);
assert.match(sources.get('src/ui/rank.js'), /setText\('rankDialogTitle'/);
const canonicalIds = ['training18', 'mastery27', 'satori73'];
for (const id of canonicalIds) assert.match(all, new RegExp(`['"]${id}['"]`), `Canonical speed id is missing: ${id}`);

const storageSource = sources.get('src/state/game-state.js');
assert.match(storageSource, /STORAGE_KEY\s*=\s*'wake7-state-vnext'/, 'Unified state storage key is missing.');
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
assert.match(sources.get('src/ui/progression-roadmap.js'), /master-road-step-template/);
assert.match(sources.get('src/ui/progression-roadmap.js'), /content\.cloneNode\(true\)/);
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
assert.match(sources.get('src/ui/progression-ui.js'), /stage-picker-row-template/);
assert.match(sources.get('src/ui/progression-ui.js'), /two-move-card-template/);
assert.match(sources.get('src/ui/progression-ui.js'), /clearedMasteryIndex/);
assert.match(sources.get('src/ui/progression-ui.js'), /currentLapPrimaryComplete/);
assert.match(sources.get('src/runtime/speed.js'), /const trialVariant=\(speedSession\?\.requiredTrial/);
assert.match(sources.get('src/ui/progression-roadmap.js'), /if\(stateClass\)step\.classList\.add\(stateClass\)/);
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
const tutorialStartAt = all.indexOf('startTutorial()');
assert.ok(introStartAt >= 0 && tutorialStartAt > introStartAt, 'Start button must lead into tutorial initialization.');
for (const token of [
  'loadTutorialStep(',
  'storage.set(STORAGE_KEYS.tutorialStep',
  'storage.remove(STORAGE_KEYS.tutorialStep',
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

// 互換fallbackは移行用に必要なものだけを許可し、通常UIの固定HTMLが
// 新たなfallbackとして増えていないかを差分レビュー時に見える化する。
const fallbackAssignments = [];
for (const [file, source] of sources) {
  source.split(/\r?\n/).forEach((line, index) => {
    if (/body\.innerHTML\s*=\s*fallback\b/.test(line)) {
      fallbackAssignments.push({ location: `${file}:${index + 1}`, file, line: line.trim() });
    }
  });
}
const documentedFallbacks = [line => line === 'body.innerHTML=fallback;'];
for (const fallback of fallbackAssignments) {
  assert.ok(fallback.file === 'src/ui/board-ui.js' && documentedFallbacks.some(test => test(fallback.line)), `Undocumented ordinary-HTML fallback found: ${fallback.location}`);
}

// 宣言一回・参照一回の関数は削除候補として報告するだけに留める。
const candidates = [];
for (const [file, source] of sources) {
  for (const [, name] of source.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    const references = (all.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
    if (references === 1) candidates.push(`${file}:${name}`);
  }
}
console.log(`Audited canonical speed ids (${canonicalIds.join(', ')}) and ${sources.size} source files.`);
console.log(`Storage boundary calls: localStorage=${localStorageCalls.length}, sessionStorage=${sessionStorageCalls.length}.`);
console.log(`Ordinary-HTML compatibility fallbacks: ${fallbackAssignments.map(item => item.location).join(', ') || 'none'}.`);
console.log(`Potential unused function candidates (review only): ${candidates.length}.`);
if (candidates.length) console.log(candidates.slice(0, 30).join(', '));
const documentedCandidates = [
  'src/main.mjs:createDevelopmentRuntime',
  'src/runtime/namespace.js:attachWakeSevenNamespace',
  'src/state/game-state.js:attachWakeSevenState',
  'src/state/progression-policy.js:attachWakeSevenProgression',
  'src/ui/board-ui.js:academyEnrollArtSvgLegacy'
];
for (const candidate of documentedCandidates) {
  assert.ok(candidates.includes(candidate), `Documented audit candidate disappeared or changed: ${candidate}`);
}
