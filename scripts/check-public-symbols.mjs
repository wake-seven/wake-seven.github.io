import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 公開版は連結された1本のmodule scriptになるため、生成後の実体を監査する。
// 完全な静的解析器ではなく、公開版で起きやすい「宣言漏れ」を検出する保守用監査。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const htmlPath = join(root, 'index.html');
const reportPath = join(root, 'build', 'report', 'public-symbols.json');
const budgetPath = join(root, 'scripts', 'public-symbols-budget.json');
const budget = JSON.parse(await readFile(budgetPath, 'utf8'));
const html = await readFile(htmlPath, 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1]).filter(code => /\b(?:function|const|let|var|class)\b/.test(code));
assert.ok(scripts.length > 0, 'Generated index.html has no application script. Run npm run build first.');
const source = scripts.join('\n');

const mask = input => {
  const output = [...input];
  let mode = 'code';
  let quote = '';
  for (let i = 0; i < input.length; i++) {
    const current = input[i], next = input[i + 1];
    if (mode === 'code' && current === '/' && next === '*') { mode = 'block'; output[i] = output[i + 1] = ' '; i++; continue; }
    if (mode === 'code' && current === '/' && next === '/') { mode = 'line'; output[i] = output[i + 1] = ' '; i++; continue; }
    if (mode === 'code' && (current === "'" || current === '"' || current === '`')) { mode = 'string'; quote = current; output[i] = ' '; continue; }
    if (mode === 'line') { if (current === '\n') mode = 'code'; else output[i] = ' '; continue; }
    if (mode === 'block') { if (current === '*' && next === '/') { output[i] = output[i + 1] = ' '; i++; mode = 'code'; } else if (current !== '\n') output[i] = ' '; continue; }
    if (mode === 'string') {
      if (current === '\\') { if (current !== '\n') output[i] = ' '; if (i + 1 < input.length) { if (input[i + 1] !== '\n') output[i + 1] = ' '; i++; } continue; }
      if (current === quote) { output[i] = ' '; mode = 'code'; } else if (current !== '\n') output[i] = ' ';
    }
  }
  return output.join('');
};
const code = mask(source);
const lineOf = offset => source.slice(0, offset).split('\n').length;
const identifier = /[A-Za-z_$][\w$]*/g;
const names = new Set();
const addMatches = expression => {
  for (const match of code.matchAll(expression)) names.add(match[1]);
};

// 分割代入の束縛名も宣言として扱う。単純な名前の集合だけで判定すると、
// `{ value }` や関数引数の `{ value }` を未定義参照と誤認してしまう。
const addBindingNames = expression => {
  for (const match of code.matchAll(expression)) {
    for (const binding of match[1].matchAll(identifier)) names.add(binding[0]);
  }
};

// ブロックスコープを個別に再構築せず、宣言された名前を全体の候補集合にする。
addMatches(/\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g);
addBindingNames(/\b(?:const|let|var)\s*[={[^]([^\n;]*?)[}\]]\s*=/g);
addBindingNames(/\bfunction(?:\s+[A-Za-z_$][\w$]*)?\s*\(([^)]*)\)/g);
addBindingNames(/\(([^)]*)\)\s*=>/g);
addBindingNames(/\bcatch\s*\(([^)]*)\)/g);
for (const match of code.matchAll(/\bfunction(?:\s+[A-Za-z_$][\w$]*)?\s*\(([^)]*)\)/g)) {
  for (const parameter of match[1].matchAll(identifier)) names.add(parameter[0]);
}
for (const match of code.matchAll(/\b(?:catch|for)\s*\(\s*([A-Za-z_$][\w$]*)/g)) names.add(match[1]);
for (const match of code.matchAll(/(?:^|[=(,])\s*([A-Za-z_$][\w$]*)\s*=>/g)) names.add(match[1]);

const allowed = new Set((
  'as async await break case catch class const continue debugger default delete do else export extends false finally for from function get if import in instanceof let new null of return set static super switch this throw true try typeof var void while with yield '
  + 'Array ArrayBuffer BigInt Boolean DataView Date Error EvalError Float32Array Float64Array FormData Function Headers Intl JSON Map Math NaN Number Object Promise Proxy RangeError ReferenceError Reflect RegExp Set String Symbol SyntaxError TypeError URIError URL URLSearchParams WeakMap WeakSet Infinity undefined '
  + 'alert atob btoa cancelAnimationFrame clearInterval clearTimeout confirm console decodeURIComponent document encodeURIComponent escape eval fetch getComputedStyle globalThis isFinite isNaN localStorage location matchMedia navigator parseFloat parseInt performance queueMicrotask requestAnimationFrame screen sessionStorage setInterval setTimeout structuredClone unescape window crypto CSS CustomEvent Event HTMLElement Node SVGElement Text DOMParser ResizeObserver MutationObserver WebSocket'
).split(/\s+/));
const candidates = [];
for (const match of code.matchAll(identifier)) {
  const name = match[0];
  const offset = match.index;
  const before = code.slice(Math.max(0, offset - 1), offset);
  const after = code.slice(offset + name.length);
  if (names.has(name) || allowed.has(name) || before === '.' || after.match(/^\s*:/)) continue;
  // 宣言名、オブジェクトの分割キー、HTML/CSS属性相当の文字列は除外する。
  if (/\b(?:const|let|var|function|class)\s*$/.test(code.slice(Math.max(0, offset - 12), offset))) continue;
  if (/^\s*(?:[,}])/.test(after) && /[{,]\s*$/.test(code.slice(Math.max(0, offset - 2), offset))) continue;
  candidates.push({ name, line: lineOf(offset) });
}
const unique = [...new Map(candidates.map(item => [item.name, item])).values()]
  .sort((left, right) => left.name.localeCompare(right.name));
const knownScopeCandidates = new Set('advance arm awakening back begin canEnter clearFlow commit complete definitions intermediate isClearShown json mastery on openPicker openRank openReview pathInfo pause pauseClock persist query queryAll remove render renderReview restore reset satoriIntro secondLapIntro select setClearShown setJson setMode speedComplete speedIntro speedTrialFailed speedUnlocked startClock uiPolicy update'.split(' '));
const browserGlobals = new Set(('Array ArrayBuffer BigInt Boolean DataView Date Error EvalError Float32Array Float64Array Int8Array Int16Array Int32Array Uint8Array Uint8ClampedArray Uint16Array Uint32Array BigInt64Array BigUint64Array FormData Function Headers Intl JSON Map Math NaN Number Object Promise Proxy RangeError ReferenceError Reflect RegExp Set String Symbol SyntaxError TypeError URIError URL URLSearchParams WeakMap WeakSet Infinity undefined alert atob btoa cancelAnimationFrame clearInterval clearTimeout confirm console decodeURIComponent document encodeURIComponent escape eval fetch getComputedStyle globalThis isFinite isNaN localStorage location matchMedia navigator parseFloat parseInt performance queueMicrotask requestAnimationFrame screen sessionStorage setInterval setTimeout structuredClone unescape window crypto CSS CustomEvent Event HTMLElement Node SVGElement Text DOMParser ResizeObserver MutationObserver WebSocket').split(/\s+/));
const publicPrefixes = /^(?:WakeSeven(?:State|Progression)?|STORAGE_|ACTIVE_|SPEED_|PRIMARY_|TRAINING_|MASTER_|MASTERY_|SATORI_|EXTRA_)/;
const configName = /(?:CONFIG|DEFINITION|DEFINITIONS|POLICY|RULE|STAGES?|PATTERNS?|TEXT|MESSAGES?|CONTENT|QUIZ|ROUND|ROUNDS|MODE|MODES|KEYS?|IDS?|COUNT|TOTAL|LIMIT|THRESHOLD|DURATION|TIMEOUT|TEMPLATE|SELECTOR|DOM)/i;
const classify = item => {
  if (browserGlobals.has(item.name)) return 'browser-api';
  if (publicPrefixes.test(item.name) || /^WakeSeven(?:\.|$)/.test(item.name)) return 'public-namespace';
  const escaped = item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const occurrences = [...code.matchAll(new RegExp(`\\b${escaped}\\b`, 'g'))];
  const objectKey = occurrences.some(match => /^\s*:/.test(code.slice(match.index + item.name.length)));
  if (objectKey) return 'object-key';
  if (knownScopeCandidates.has(item.name)) return 'local-scope';
  if (configName.test(item.name)) return 'configuration-or-data';
  const call = occurrences.some(match => /^\s*\(/.test(code.slice(match.index + item.name.length)));
  if (call) return 'actual-undefined';
  return 'local-scope';
};
const classifiedCandidates = unique.map(item => ({ ...item, category: classify(item) }));
// ブロックスコープは完全再構築せず、既知の局所候補を分類済みとして扱う。
const actualUndefinedCandidates = classifiedCandidates.filter(item => item.category === 'actual-undefined');
const classificationExamples = Object.fromEntries([...new Set(classifiedCandidates.map(item => item.category))].map(category => [
  category,
  classifiedCandidates.filter(item => item.category === category).slice(0, 5).map(item => item.name)
]));
const externalCandidates = classifiedCandidates.filter(item => item.category === 'public-namespace' || item.category === 'configuration-or-data');
const report = {
  generatedAt: new Date().toISOString(),
  source: 'index.html generated application module',
  scriptCount: scripts.length,
  allowlistSize: allowed.size,
  declaredNameCount: names.size,
  unresolvedCandidates: unique,
  classifiedCandidates,
  classificationCounts: Object.fromEntries([...new Set(classifiedCandidates.map(item => item.category))].map(category => [category, classifiedCandidates.filter(item => item.category === category).length])),
  classificationExamples,
  actualUndefinedCandidates,
  externalCandidates,
  passed: actualUndefinedCandidates.length === 0,
  note: '候補を実未定義、ローカル/スコープ、オブジェクトキー、ブラウザAPI、公開名前空間、設定/データに分類する。実未定義（解決不能な呼び出し位置）だけをエラー扱いし、分類済み候補は監査記録として残す。'
};
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
assert.equal(actualUndefinedCandidates.length, 0, `Possible undefined call-site symbols: ${actualUndefinedCandidates.map(item => item.name).join(', ')}`);
assert.ok(unique.length <= budget.total, `Public symbol candidate count grew from ${budget.total} to ${unique.length}. Update scripts/public-symbols-budget.json only after review.`);
for (const [category, maximum] of Object.entries(budget.categories || {})) {
  const actual = classifiedCandidates.filter(item => item.category === category).length;
  assert.ok(actual <= maximum, `Public symbol category ${category} grew from ${maximum} to ${actual}. Update the budget only after review.`);
}
console.log(`Public symbols audit OK: ${names.size} declarations, ${scripts.length} scripts; candidates ${unique.length}, classified ${classifiedCandidates.length}.`);
