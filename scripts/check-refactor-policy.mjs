import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const uiRoot = join(root, 'src', 'ui');
const architectureDoc = await readFile(join(root, 'docs', 'architecture-audit.md'), 'utf8');
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

assert.match(architectureDoc, /## 大規模な構造変更の停止基準/,
  'Architecture guidance must define a stop policy for large refactors.');
assert.equal(packageJson.scripts['check:browser-e2e'], 'node scripts/check-browser-e2e.mjs',
  'Browser E2E command must remain available before structural changes.');
await access(join(root, 'scripts', 'check-browser-e2e.mjs'), constants.F_OK);

const uiEntries = await readdir(uiRoot, { withFileTypes: true });
const shardedNames = uiEntries
  .filter(entry => entry.isFile() && /^progression-(?:part|chunk)-\d+\.js$/.test(entry.name))
  .map(entry => entry.name);
assert.deepEqual(shardedNames, [],
  `Do not create numbered progression shards without a documented responsibility: ${shardedNames.join(', ')}`);

const progressionUi = await readFile(join(uiRoot, 'progression-ui.js'), 'utf8');
const lines = progressionUi.split('\n').length;
if (lines > 1100) {
  console.warn(`Progression UI is ${lines} lines; review whether a feature change is being mixed with a large refactor.`);
}
console.log(`Refactor policy audited: browser E2E present; progression-ui.js=${lines} lines.`);
