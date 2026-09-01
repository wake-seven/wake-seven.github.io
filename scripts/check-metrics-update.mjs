import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const baselinePath = join(root, 'scripts', 'public-esm-metrics.json');
const updaterPath = join(root, 'scripts', 'update-public-esm-metrics.mjs');
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const before = await readFile(baselinePath, 'utf8');
assert.equal(packageJson.scripts['metrics:update'], 'node scripts/update-public-esm-metrics.mjs',
  'Explicit metrics update command is missing.');
const help = spawnSync(process.execPath, [updaterPath, '--help'], { cwd: root, encoding: 'utf8' });
assert.equal(help.status, 0, `Metrics update help failed: ${help.stderr}`);
assert.match(help.stdout, /Usage: npm run metrics:update/);
const missingReason = spawnSync(process.execPath, [updaterPath], { cwd: root, encoding: 'utf8' });
assert.equal(missingReason.status, 2, 'Metrics update must require an explicit reason.');
assert.match(missingReason.stdout + missingReason.stderr, /Usage: npm run metrics:update/);
const after = await readFile(baselinePath, 'utf8');
assert.equal(after, before, 'Help/argument validation must not modify the metrics baseline.');
console.log('Validated metrics update help, reason validation, and baseline immutability.');
