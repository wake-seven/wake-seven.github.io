import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const srcRoot = join(root, 'src');
const auditDoc = await readFile(join(srcRoot, 'compat-audit.md'), 'utf8');
for (const heading of ['# 互換層・未使用候補監査', '## 互換ID', '## 互換キー']) {
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
const canonicalIds = ['training18', 'mastery27', 'satori73'];
const legacyIds = ['mastery15', 'mastery24'];
for (const id of canonicalIds) assert.match(all, new RegExp(`['"]${id}['"]`), `Canonical speed id is missing: ${id}`);
for (const id of legacyIds) assert.match(all, new RegExp(`['"]${id}['"]`), `Legacy speed alias lost: ${id}`);
assert.match(sources.get('src/state/game-state.js'), /mastery15\s*:\s*'training18'/, 'Legacy mastery15 migration is missing.');
assert.match(sources.get('src/state/game-state.js'), /mastery24\s*:\s*'mastery27'/, 'Legacy mastery24 migration is missing.');

const storageSource = sources.get('src/state/game-state.js');
assert.match(storageSource, /STORAGE_KEY\s*=\s*'wake7-state-vnext'/, 'Unified state storage key is missing.');
assert.match(storageSource, /LEGACY_STORAGE_KEYS\s*=\s*Object\.freeze/, 'Legacy storage key registry is missing.');
const directStorage = all.match(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)/g) || [];
const localStorageCalls = all.match(/localStorage\.(?:getItem|setItem|removeItem)/g) || [];
const sessionStorageCalls = all.match(/sessionStorage\.(?:getItem|setItem|removeItem)/g) || [];
assert.equal(localStorageCalls.length, 5, `State boundary storage calls changed: ${localStorageCalls.length}`);
assert.equal(sessionStorageCalls.length, 2, `Analytics session storage calls changed: ${sessionStorageCalls.length}`);

// 開始→チュートリアル→盤面操作を支えるDOM契約。文言変更には影響せず、要素の消失だけを検出する。
const template = sources.get('src/index.template.html');
for (const id of ['introDialog', 'introStart', 'tutorialReset', 'board', 'boardGuidance', 'reset', 'undo']) {
  assert.match(template, new RegExp(`id=["']${id}["']`), `Main flow DOM contract is missing: ${id}`);
}
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

const legacyLocations = [...sources.entries()]
  .filter(([, source]) => legacyIds.some(id => source.includes(id)))
  .map(([file]) => file);
const expectedLegacyLocations = new Set(['src/state/game-state.js', 'src/state/progression-policy.js', 'src/runtime/runtime.js', 'src/runtime/app-events.js', 'src/runtime/speed.js', 'src/ui/progression.js']);
for (const file of legacyLocations) {
  assert.ok(expectedLegacyLocations.has(file), `Legacy speed id spread into unexpected source: ${file}`);
}

// 宣言一回・参照一回の関数は削除候補として報告するだけに留める。
const candidates = [];
for (const [file, source] of sources) {
  for (const [, name] of source.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    const references = (all.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
    if (references === 1) candidates.push(`${file}:${name}`);
  }
}
console.log(`Audited compatibility aliases (${legacyIds.join(', ')}) and ${sources.size} source files.`);
console.log(`Storage boundary calls: localStorage=${localStorageCalls.length}, sessionStorage=${sessionStorageCalls.length}.`);
console.log(`Legacy speed-id compatibility locations: ${legacyLocations.join(', ')}.`);
console.log(`Potential unused function candidates (review only): ${candidates.length}.`);
if (candidates.length) console.log(candidates.slice(0, 30).join(', '));
