import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 公開版は連結された1本のmodule scriptになるため、生成後の実体を監査する。
// 完全な静的解析器ではなく、公開版で起きやすい「宣言漏れ」を検出する保守用監査。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const htmlPath = join(root, 'index.html');
const reportPath = join(root, 'build', 'report', 'public-symbols.json');
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

// ブロックスコープを個別に再構築せず、宣言された名前を全体の候補集合にする。
addMatches(/\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g);
for (const match of code.matchAll(/\bfunction(?:\s+[A-Za-z_$][\w$]*)?\s*\(([^)]*)\)/g)) {
  for (const parameter of match[1].matchAll(identifier)) names.add(parameter[0]);
}
for (const match of code.matchAll(/\b(?:catch|for)\s*\(\s*([A-Za-z_$][\w$]*)/g)) names.add(match[1]);
for (const match of code.matchAll(/(?:^|[=(,])\s*([A-Za-z_$][\w$]*)\s*=>/g)) names.add(match[1]);

const allowed = new Set((
  'as async await break case catch class const continue debugger default delete do else export extends false finally for from function get if import in instanceof let new null of return set static super switch this throw true try typeof var void while with yield '
  + 'Array ArrayBuffer BigInt Boolean DataView Date Error EvalError Float32Array Float64Array FormData Function Headers Intl JSON Map Math NaN Number Object Promise Proxy RangeError ReferenceError Reflect RegExp Set String Symbol SyntaxError TypeError URIError URL URLSearchParams WeakMap WeakSet Infinity undefined '
  + 'alert atob btoa cancelAnimationFrame clearInterval clearTimeout confirm decodeURIComponent document encodeURIComponent escape eval fetch globalThis isFinite isNaN localStorage location navigator parseFloat parseInt performance queueMicrotask requestAnimationFrame screen setInterval setTimeout structuredClone unescape window crypto CSS CustomEvent Event HTMLElement Node SVGElement Text DOMParser ResizeObserver MutationObserver'
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
const externalCandidates = unique.filter(item => /^(?:WakeSeven|STORAGE_|ACTIVE_|SPEED_|PRIMARY_|TRAINING_|MASTER_|SATORI_|EXTRA_)/.test(item.name));
const report = {
  generatedAt: new Date().toISOString(),
  source: 'index.html generated application module',
  scriptCount: scripts.length,
  allowlistSize: allowed.size,
  declaredNameCount: names.size,
  unresolvedCandidates: unique,
  externalCandidates,
  passed: true,
  note: '候補は名前単位で出力する警告。プロパティ名・組み込みAPI・ブラウザAPIは許可リストで除外する。候補が出た場合は生成物の該当行を確認し、正当な公開グローバルなら許可リストへ理由付きで追加する。既存のmanifest-depsが連結順の失敗を検出するため、この監査は誤検出を含む候補を失敗条件にしない。'
};
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(`Public symbols audit OK: ${names.size} declarations, ${scripts.length} scripts; candidates ${unique.length}, external-looking ${externalCandidates.length}.`);
