import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCheckRegistry } from './check-registry.mjs';

// 検査プロファイルは実行入口とは分離し、名前・範囲・予算だけを検証する。
// check:gate の手順はここから変更せず、full が同じ手順集合であることだけを保証する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const readJson = async file => JSON.parse(await readFile(join(root, 'scripts', file), 'utf8'));
const profiles = await readJson('check-profiles.json');
const pipeline = await readJson('check-pipeline.json');
const executionContract = await readJson('check-execution-contract.json');
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const registryValidation = await validateCheckRegistry(root);
assert.deepEqual(registryValidation.errors, [], `check-registry.json の整合性エラー:\n${registryValidation.errors.join('\n')}`);
const gateSteps = registryValidation.registry.steps.map(step => step.name);
const names = ['fast', 'affected', 'full'];
assert.equal(profiles.schemaVersion, 1, 'check-profiles.json のschemaVersionが不正です');
assert.deepEqual(Object.keys(pipeline.steps || {}).sort(), [...gateSteps].sort(), 'check-pipeline.json は正本の手順集合と一致させてください');
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
assert.equal(profiles.policy?.workflow?.editing?.command, 'npm run check:auto', 'editingの入口はcheck:autoにしてください');
assert.equal(profiles.policy?.workflow?.milestone?.command, 'npm run check:milestone', 'milestoneの入口が不正です');
assert.equal(profiles.policy?.workflow?.milestone?.profile, 'affected', 'milestoneはaffected profileを使ってください');
assert.equal(profiles.policy?.workflow?.release?.command, 'npm run check:release', 'releaseの入口が不正です');
assert.equal(profiles.policy?.workflow?.release?.profile, 'full', 'releaseはfull profileを使ってください');
assert.equal(pipeline.profiles?.['device-serial']?.serial, true, 'device-serial はserial実行を明示してください');
assert.equal(pipeline.steps?.['device-e2e'], 'device-serial', 'device-e2e はdevice-serial区分で実行してください');
assert.equal(profiles.policy?.deviceE2E?.stabilityRuns, 3, 'device E2Eの安定性確認は3回で固定してください');
assert.deepEqual(profiles.policy?.deviceE2E?.automaticInProfiles, ['full'], 'device E2Eはfull以外で自動実行しない契約にしてください');
assert.deepEqual(profiles.policy?.deviceE2E?.automaticAtMilestoneFor, ['touch-or-responsive'], 'milestoneで端末E2Eを追加する変更種別が不正です');
assert.equal(packageJson.scripts?.['check:milestone'], 'node scripts/run-check-workflow.mjs milestone', 'check:milestoneの実行入口が不正です');
assert.equal(packageJson.scripts?.['check:release'], 'node scripts/run-check-workflow.mjs release', 'check:releaseの実行入口が不正です');
assert.deepEqual(executionContract.workflow?.milestone?.requiredChecks, ['browser-e2e'], 'milestoneはブラウザE2Eを必須にしてください');
assert.deepEqual(executionContract.workflow?.release?.requiredChecks, ['check:gate', 'browser-e2e', 'device-e2e'], 'releaseは全体ゲート・ブラウザE2E・端末E2Eを必須にしてください');
const milestoneKinds=(executionContract.conditionalMilestoneChecks||[]).map(rule=>rule.name);
assert.deepEqual(milestoneKinds, profiles.policy?.deviceE2E?.automaticAtMilestoneFor, '端末E2Eを追加するmilestone変更種別を実行契約と一致させてください');
console.log('Check profiles schema OK: editing, milestone, release workflows use fast/affected/full profiles.');
