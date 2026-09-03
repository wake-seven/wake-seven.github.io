import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 検査プロファイルは実行入口とは分離し、名前・範囲・予算だけを検証する。
// check:gate の手順はここから変更せず、full が同じ手順集合であることだけを保証する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const readJson = async file => JSON.parse(await readFile(join(root, 'scripts', file), 'utf8'));
const profiles = await readJson('check-profiles.json');
const pipeline = await readJson('check-pipeline.json');
const gateSteps = Object.keys(pipeline.steps || {});
const names = ['fast', 'affected', 'full'];
assert.equal(profiles.schemaVersion, 1, 'check-profiles.json のschemaVersionが不正です');
assert.deepEqual(Object.keys(profiles.profiles || {}).sort(), [...names].sort(), 'fast/affected/full の3プロファイルが必要です');
const known = new Set(gateSteps);
for (const name of names) {
  const profile = profiles.profiles[name];
  assert.ok(profile.description && Number.isFinite(profile.budgetMs), `${name} の説明または時間予算がありません`);
  assert.ok(Array.isArray(profile.steps) && profile.steps.length > 0, `${name}.steps が空です`);
  assert.equal(new Set(profile.steps).size, profile.steps.length, `${name}.steps に重複があります`);
  assert.ok(profile.steps.every(step => known.has(step)), `${name}.steps にcheck:gate未定義の手順があります`);
  if (name !== 'full') assert.ok(profile.steps.every(step => profiles.profiles.full.steps.includes(step)), `${name} がfullの範囲外です`);
}
assert.deepEqual(new Set(profiles.profiles.full.steps), new Set(gateSteps), 'full はcheck:gateの手順集合と一致させてください');
for (const [domain, steps] of Object.entries(profiles.profiles.affected.byDomain || {})) {
  assert.ok(Array.isArray(steps) && steps.length > 0, `affected.${domain} が空です`);
  assert.ok(steps.every(step => profiles.profiles.affected.steps.includes(step)), `affected.${domain} にaffected外の手順があります`);
}
assert.equal(profiles.policy?.gateProfile, 'full', 'check:gateのプロファイルはfullに固定してください');
console.log('Check profiles schema OK: fast, affected, full. check:gate behavior unchanged.');
