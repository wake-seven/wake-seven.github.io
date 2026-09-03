import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishedSourceFiles } from './application-manifest.mjs';

// classic公開版はESMのimportグラフを持たないため、連結前に「提供側が先か」を検査する。
// 完全なJavaScriptパーサーを導入せず、トップレベルの公開シンボルと呼び出しだけを対象にする。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const srcRoot = join(root, 'src');
const reportPath = join(root, 'build', 'report', 'manifest-dependencies.json');
const files = await Promise.all(publishedSourceFiles.map(async (file, index) => ({
  file,
  index,
  text: await readFile(join(srcRoot, file), 'utf8')
})));

const mask = source => source
  .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
  .replace(/\/\/[^\n]*/g, m => m.replace(/[^\n]/g, ' '))
  .replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, m => m.replace(/[^\n]/g, ' '));
const lineOf = (text, offset) => text.slice(0, offset).split('\n').length;
const braceDepthAt = (code, offset) => {
  let depth = 0;
  for (const char of code.slice(0, offset)) {
    if (char === '{') depth++;
    else if (char === '}') depth = Math.max(0, depth - 1);
  }
  return depth;
};
const identifier = /^[A-Za-z_$][\w$]*$/;
const reserved = new Set((
  'as async await break case catch class const continue debugger default delete do else export extends false finally for from function get if import in instanceof let new null of return set static super switch this throw true try typeof var void while with yield '
  + 'Array Boolean Date Error Intl JSON Math Number Object Promise Proxy Reflect RegExp Set String Symbol TypeError URL WeakMap WeakSet console document window globalThis undefined NaN Infinity'
).split(/\s+/));
const browserGlobals = new Set((
  'alert cancelAnimationFrame clearInterval clearTimeout confirm decodeURIComponent encodeURIComponent fetch isFinite isNaN parseFloat parseInt queueMicrotask requestAnimationFrame setInterval setTimeout structuredClone SVGElement HTMLElement Event CustomEvent performance localStorage navigator location crypto CSS URLSearchParams'
).split(/\s+/));

function topLevelDeclarations(source) {
  const code = mask(source);
  const declarations = [];
  let depth = 0;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    if (depth !== 0) continue;
    const rest = code.slice(i);
    let match = rest.match(/^function\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (!match) match = rest.match(/^class\s+([A-Za-z_$][\w$]*)\b/);
    if (!match) match = rest.match(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*[=;]/);
    if (!match) continue;
    declarations.push({ name: match[1], kind: match[0].startsWith('function') ? 'function' : match[0].startsWith('class') ? 'class' : 'variable', line: lineOf(source, i), offset: i });
    i += match[0].length - 1;
  }
  // `let a=..., b=...` のような同一宣言も全て公開シンボルとして拾う。
  for (const match of code.matchAll(/\b(?:const|let|var)\s+([^;\n]+)/g)) {
    if (braceDepthAt(code, match.index) !== 0) continue;
    for (const item of match[1].matchAll(/(?:^|,)\s*([A-Za-z_$][\w$]*)\s*=/g)) {
      const offset = match.index + match[0].indexOf(item[1]);
      if (!declarations.some(declaration => declaration.name === item[1] && declaration.offset === offset)) {
        declarations.push({ name: item[1], kind: 'variable', line: lineOf(source, offset), offset });
      }
    }
  }
  return declarations;
}

const providers = new Map();
const declarations = [];
for (const entry of files) {
  for (const declaration of topLevelDeclarations(entry.text)) {
    const item = { ...declaration, file: entry.file, index: entry.index };
    declarations.push(item);
    if (!providers.has(item.name)) providers.set(item.name, item);
  }
}

const orderErrors = [];
const unresolvedCalls = [];
const unresolvedState = [];
for (const entry of files) {
  const code = mask(entry.text);
  const localNames = new Set([...topLevelDeclarations(entry.text).map(item => item.name), ...[...code.matchAll(/\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)].map(item => item[1])]);
  for (const match of code.matchAll(/\bfunction\s+[A-Za-z_$][\w$]*\s*\(([^)]*)\)/g)) {
    for (const parameter of match[1].matchAll(/[A-Za-z_$][\w$]*/g)) localNames.add(parameter[0]);
  }
  for (const match of code.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) {
    const name = match[1];
    if (code[match.index - 1] === '.' || /[{,]\s*$/.test(code.slice(Math.max(0, match.index - 12), match.index))) continue;
    if (reserved.has(name) || browserGlobals.has(name) || localNames.has(name)) continue;
    const provider = providers.get(name);
    if (!provider) {
      unresolvedCalls.push({ name, file: entry.file, line: lineOf(entry.text, match.index) });
    } else if (provider.kind !== 'function' && provider.index > entry.index && braceDepthAt(code, match.index) === 0) {
      orderErrors.push({ name, consumer: entry.file, consumerLine: lineOf(entry.text, match.index), provider: provider.file, providerLine: provider.line });
    }
  }
  // 共有状態はcamelCaseの裸参照でも壊れるため、既知の状態接頭辞を補助的に監査する。
  for (const match of code.matchAll(/\b([a-z][A-Za-z0-9_$]*(?:Lap|Picker|Mode|Index|Stages|Rounds|Unlocked|Cleared))\b/g)) {
    const name = match[1];
    const after = code.slice(match.index + name.length).match(/^\s*:/);
    if (code[match.index - 1] === '.' || localNames.has(name) || providers.has(name) || after) continue;
    unresolvedState.push({ name, file: entry.file, line: lineOf(entry.text, match.index) });
  }
}

const unique = items => [...new Map(items.map(item => [JSON.stringify(item), item])).values()];
const report = {
  generatedAt: new Date().toISOString(),
  source: 'scripts/application-manifest.mjs:publishedSourceFiles',
  files: publishedSourceFiles,
  declarations: declarations.map(({ name, kind, file, line }) => ({ name, kind, file, line })),
  orderErrors,
  unresolvedCalls: unique(unresolvedCalls),
  unresolvedState: unique(unresolvedState),
  passed: orderErrors.length === 0,
  note: '未解決状態・関数呼び出しは候補として出力する。DOMプロパティやローカル関数の誤検出を避けるため、連結順の明確な違反だけを失敗条件とする。'
};
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
assert.equal(orderErrors.length, 0, `Manifest dependency order error: ${orderErrors[0]?.name}`);
console.log(`Manifest dependencies OK: ${files.length} files, ${declarations.length} top-level declarations; unresolved candidates ${unresolvedCalls.length + unresolvedState.length}.`);
