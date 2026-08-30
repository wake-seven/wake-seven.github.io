import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const srcRoot = join(root, 'src');
const modules = [];
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (extname(entry.name) === '.mjs') modules.push(path);
  }
}
await collect(srcRoot);
const known = new Set(modules.map(path => resolve(path)));
let imports = 0;
for (const file of modules) {
  const source = await readFile(file, 'utf8');
  for (const [, specifier] of source.matchAll(/\b(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"](\.\.?\/[^'"]+)['"]/g)) {
    imports++;
    assert.match(specifier, /\.mjs$/, `ESM dependency must use .mjs extension: ${relative(root, file)} -> ${specifier}`);
    const dependency = resolve(dirname(file), specifier);
    assert.ok(known.has(dependency), `Missing ESM dependency: ${relative(root, file)} -> ${specifier}`);
  }
  // ESM services receive browser capabilities by injection; direct globals hide dependencies.
  assert.doesNotMatch(source, /\bwindow\s*\./, `Direct window reference remains in ${relative(root, file)}.`);
  assert.doesNotMatch(source, /\bdocument\s*\./, `Direct document reference remains in ${relative(root, file)}.`);
}
assert.ok(modules.length > 0, 'No ESM source modules found.');
console.log(`Validated ${modules.length} ESM modules and ${imports} relative dependencies.`);
