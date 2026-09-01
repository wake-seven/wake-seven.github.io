import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { developmentSourceFiles, publishedSourceFiles, trackedSourceFiles } from './application-manifest.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const srcRoot = join(root, 'src');
const expected = new Set(trackedSourceFiles);
const files = [];
assert.ok(developmentSourceFiles.every(path => path.endsWith('.mjs')), 'Development source must be ESM-only.');
assert.ok(publishedSourceFiles.every(path => path.endsWith('.js')), 'Published concatenation source must remain classic-compatible modules.');
assert.deepEqual(developmentSourceFiles.filter(path => publishedSourceFiles.includes(path)), [], 'Development ESM and published source manifests must not overlap.');
const intentionalDuals = new Set(['audio', 'board-commands', 'board-domain', 'board-quiz', 'progression-commands', 'progression-runtime', 'render', 'satori', 'settings']);
const duals = new Set(developmentSourceFiles.map(path => path.replace(/\.mjs$/, '')).filter(path => publishedSourceFiles.some(published => published.replace(/\.js$/, '') === path)).map(path => path.split('/').pop()));
assert.deepEqual([...duals].sort(), [...intentionalDuals].sort(), 'Classic/ESM duplicate implementation set changed; classify it before adding new code.');

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (['.js', '.mjs'].includes(extname(entry.name))) files.push(path);
  }
}

await collect(srcRoot);
const sourcePaths = new Set(files.map(path => relative(srcRoot, path).replaceAll('\\', '/')));
for (const listed of expected) {
  assert.ok(sourcePaths.has(listed), `Published source is missing: src/${listed}`);
}

const unlisted = [...sourcePaths].filter(path => !expected.has(path)).sort();
const jsFiles = files.filter(path => extname(path) === '.js');
const classic = [];
for (const path of jsFiles) {
  const source = await readFile(path, 'utf8');
  if (!/^\s*(?:import|export)\s/m.test(source)) classic.push(relative(srcRoot, path).replaceAll('\\', '/'));
}

// classic実装の残存は移行課題として可視化する。公開ビルド対象外の漏れだけを失敗にする。
assert.deepEqual(unlisted, [], `Unlisted JavaScript sources detected: ${unlisted.join(', ')}`);
console.log(`Audited ${files.length} source modules; syntax-only classic compatibility files: ${classic.length}.`);
if (classic.length) console.log(`Classic files: ${classic.join(', ')}`);
