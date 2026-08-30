import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const html = await readFile(join(root, 'index.html'), 'utf8');
const startMarker = '<!-- WAKE7:APPLICATION-MODULES:START -->';
const endMarker = '<!-- WAKE7:APPLICATION-MODULES:END -->';
const start = html.indexOf(startMarker);
const end = html.indexOf(endMarker);
assert.ok(start >= 0 && end > start, 'Generated index.html is missing the application module markers.');

const application = html.slice(start + startMarker.length, end);
const scripts = [...application.matchAll(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi)];
assert.equal(scripts.length, 1, `Expected one bundled application script, found ${scripts.length}.`);
const [applicationScript] = scripts;
assert.match(applicationScript[0], /<script\b[^>]*\btype=["']module["'][^>]*>/i,
  'The bundled application script must be <script type="module">.');
assert.doesNotMatch(applicationScript[0], /<script\b(?![^>]*\btype=["']module["'])[^>]*>/i,
  'A classic application script remains in the generated application region.');

for (const api of [
  'WakeSevenBoardDomain',
  'WakeSevenState',
  'WakeSevenProgressionCommands',
  'WakeSevenBoardCommands',
  'window.WakeSeven'
]) {
  assert.ok(application.includes(api), `Bundled application module is missing ${api}.`);
}

console.log('Validated generated index.html as an ESM-only application bundle.');
