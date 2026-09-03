import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 変更対象に対する推奨プロファイルと必須検査を、実行前に取得するCLI。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const contract = JSON.parse(await readFile(join(root, 'scripts/check-execution-contract.json'), 'utf8'));
const profiles = JSON.parse(await readFile(join(root, 'scripts/check-profiles.json'), 'utf8'));
const pipeline = JSON.parse(await readFile(join(root, 'scripts/check-pipeline.json'), 'utf8'));
const raw = execFileSync('git', ['status', '--porcelain=v1', '-z'], { cwd: root, encoding: 'utf8' });
const changedFiles = raw.split('\0').filter(Boolean).map(value => value.slice(3).replaceAll('\\', '/')).filter(file => !file.startsWith('build/report/'));
const matches = rule => changedFiles.some(file => rule.paths.some(path => path === '.md' ? file.endsWith('.md') : file === path || file.startsWith(path)));
const scope = contract.policy.precedence.find(name => name !== 'clean' && contract.rules.some(rule => rule.scope === name && matches(rule))) || 'clean';
const execution = contract.scopes[scope];
assert.ok(execution, `実行契約のscopeがありません: ${scope}`);
const known = new Set(Object.keys(pipeline.steps || {}));
const knownCommands = new Set(['check:gate', 'check:fast', 'check:affected']);
for (const step of [...execution.mustRun, ...execution.mustNotRun]) assert.ok(known.has(step) || knownCommands.has(step), `実行契約に未知の検査があります: ${step}`);
assert.ok(profiles.profiles[execution.profile], `実行契約に未知のprofileがあります: ${execution.profile}`);
const sourceRevision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() || 'working-tree';
const result = { schemaVersion: 1, name: 'wake7-execution-contract', generatedAt: new Date().toISOString(), sourceRevision, status: 'passed', warnings: [], errors: [], scope, profile: execution.profile, mustRun: execution.mustRun, mustNotRun: execution.mustNotRun, fullGateRequired: execution.fullGateRequired, changedFiles, policy: contract.policy, command: `npm run check:${execution.profile}` };
await mkdir(join(root, 'build', 'report'), { recursive: true });
await writeFile(join(root, 'build/report/check-execution-contract.json'), JSON.stringify(result, null, 2) + '\n');
console.log(`Execution contract: scope=${scope}, profile=${execution.profile}, mustRun=${execution.mustRun.join(',')}. Report: build/report/check-execution-contract.json`);
