import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// JSON.parseは重複キーを後勝ちで消すため、package.jsonの原文からscriptsキーを検査する。
// 実行入口の定義を一つに保ち、見た目と実際のnpm runの挙動がずれないようにする。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = await readFile(join(root, 'package.json'), 'utf8');
const scriptsStart = source.indexOf('"scripts"');
assert.notEqual(scriptsStart, -1, 'package.jsonにscriptsがありません');
const objectStart = source.indexOf('{', scriptsStart);
assert.notEqual(objectStart, -1, 'scriptsオブジェクトを読み取れません');
let depth = 0; let quote = false; let escaped = false; let objectEnd = -1;
for (let i = objectStart; i < source.length; i += 1) {
  const char = source[i];
  if (quote) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === '"') quote = false; continue; }
  if (char === '"') quote = true;
  else if (char === '{') depth += 1;
  else if (char === '}' && --depth === 0) { objectEnd = i; break; }
}
assert.notEqual(objectEnd, -1, 'scriptsオブジェクトが閉じていません');
const body = source.slice(objectStart + 1, objectEnd);
const names = [...body.matchAll(/^\s*"([^"\r\n]+)"\s*:/gm)].map(match => match[1]);
const duplicates = [...new Set(names.filter((name, index) => names.indexOf(name) !== index))];
assert.deepEqual(duplicates, [], `package.jsonのscriptsに重複キーがあります: ${duplicates.join(', ')}`);
for (const name of ['check:affected', 'check:fast', 'check:full']) assert.equal(names.filter(candidate => candidate === name).length, 1, `${name}は1つだけ定義してください`);
console.log(`Package scripts OK: ${names.length} unique entries`);
