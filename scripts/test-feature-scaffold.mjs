import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 雛形コマンドが、失敗時にregistryを変更しないことを確認する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const command = join(root, 'scripts', 'create-feature.mjs');
const registry = join(root, 'scripts', 'feature-registry.json');
const digest = async () => createHash('sha256').update(await readFile(registry)).digest('hex');
const before = await digest();
const runFailing = (args) => {
  assert.throws(() => execFileSync(process.execPath, [command, ...args], { cwd: root, encoding: 'utf8', stdio: 'pipe' }));
};
runFailing(['invalid_name']);
runFailing(['state']);
assert.equal(before, await digest(), '不正な雛形要求でregistryが変更されています');
const help = execFileSync(process.execPath, [command, '--help'], { cwd: root, encoding: 'utf8' });
assert.match(help, /feature:new/);
console.log('Feature scaffold OK: validation and non-mutating failures passed');
