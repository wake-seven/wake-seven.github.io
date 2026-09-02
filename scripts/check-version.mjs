import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const runtime = readFileSync(resolve(root, 'src/runtime/runtime.js'), 'utf8');
const published = readFileSync(resolve(root, 'index.html'), 'utf8');
const match = runtime.match(/const APP_VERSION='([^']+)';/);
assert.ok(match, 'APP_VERSION is missing from runtime.js');
const version = match[1];
assert.match(version, /^\d{4}\.\d{2}\.\d{2}-\d{2}:\d{2}$/, 'APP_VERSION must use YYYY.MM.DD-HH:mm');
// バージョンの日時が実行環境の現在時刻より未来になっていないことを確認する。
// タイムゾーンに依存しないよう、ローカル時刻として組み立てる。
const timeMatch = version.match(/^(\d{4})\.(\d{2})\.(\d{2})-(\d{2}):(\d{2})$/);
const versionTime = new Date(Number(timeMatch[1]),Number(timeMatch[2])-1,Number(timeMatch[3]),Number(timeMatch[4]),Number(timeMatch[5]));
assert.ok(Number.isFinite(versionTime.getTime()), 'APP_VERSION timestamp is invalid');
assert.ok(versionTime.getTime() <= Date.now()+120000, 'APP_VERSION must not be in the future');
assert.equal((published.match(new RegExp(`const APP_VERSION='${version.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}'`, 'g')) || []).length, 1,
  'generated index.html must contain the current APP_VERSION exactly once');
assert.match(published, /\$\('aboutVersion'\)\.textContent='v'\+APP_VERSION/,
  'About dialog must render APP_VERSION');

const changed = new Set();
for (const args of [['diff', '--name-only', 'HEAD'], ['diff', '--name-only', 'HEAD^', 'HEAD']]) {
  try { execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean).forEach(file => changed.add(file.replaceAll('\\', '/'))); } catch { /* Gitなしの配布環境では形式検査だけ行う。 */ }
}
const sourceChanged = [...changed].some(file => file.startsWith('src/') && file !== 'src/runtime/runtime.js');
if (sourceChanged) {
  assert.ok(changed.has('src/runtime/runtime.js'), 'ソース変更時はAPP_VERSIONを更新してください');
  assert.ok(Date.now()-versionTime.getTime() <= 24*60*60*1000, 'ソース変更時はAPP_VERSIONの日時を更新してください');
}
console.log(`Validated public version ${version}.`);
