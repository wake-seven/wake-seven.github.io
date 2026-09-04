import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCheckRegistry } from './check-registry.mjs';
import { createReport, validateReport } from './lib/report.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const config = JSON.parse(await readFile(join(root, 'scripts/feature-registry.json'), 'utf8'));
const registryResult = await validateCheckRegistry(root);
const known = new Set(registryResult.registry.steps.map(step => step.name));
const errors = [];
const referenceKinds = ['entry', 'state', 'storage', 'dom', 'next', 'e2e', 'boundaries'];
assert.equal(config.schemaVersion, 1, 'feature-registry.json schemaVersion');
const names = new Set();
for (const feature of config.features || []) {
  if (!feature?.name || names.has(feature.name)) errors.push(`機能名が空または重複しています: ${feature?.name || 'unknown'}`);
  names.add(feature.name);
  if ((!Array.isArray(feature.paths) || !feature.paths.length) && feature.status !== 'draft') errors.push(`機能のpathsがありません: ${feature.name}`);
  if (feature.status && !['active', 'draft'].includes(feature.status)) errors.push(`機能のstatusが不正です: ${feature.name}`);
  for (const check of [...(feature.checks || []), ...(feature.relatedE2E || [])]) if (!known.has(check)) errors.push(`未知の関連検査です: ${feature.name} -> ${check}`);
  const references = new Set();
  for (const kind of referenceKinds) {
    if (!(kind in feature)) continue;
    if (!Array.isArray(feature[kind]) || !feature[kind].length) { errors.push(`機能の${kind}参照が空または不正です: ${feature.name}`); continue; }
    const local = new Set();
    for (const reference of feature[kind]) {
      if (typeof reference !== 'string' || !reference.trim()) { errors.push(`機能の${kind}参照が不正です: ${feature.name}`); continue; }
      if (local.has(reference)) errors.push(`機能の${kind}参照が重複しています: ${feature.name} -> ${reference}`);
      local.add(reference); references.add(reference);
      if (reference.startsWith('feature:') && !names.has(reference.slice(8))) errors.push(`未登録機能参照です: ${feature.name} -> ${reference}`);
      else if (!reference.startsWith('feature:')) {
        try { await readFile(join(root, reference)); } catch { errors.push(`参照先が存在しません: ${feature.name}.${kind} -> ${reference}`); }
      }
    }
  }
}
errors.push(...registryResult.errors.map(error => `check-registry: ${error}`));
const changedFromGit = () => {
  const raw = execFileSync('git', ['status', '--porcelain=v1', '-z'], { cwd: root, encoding: 'utf8' });
  return raw.split('\0').filter(Boolean).map(value => value.slice(3).replaceAll('\\', '/')).filter(file => !file.startsWith('build/report/'));
};
const changedFiles = process.argv.slice(2).filter(arg => arg !== '--changed').concat(process.argv.includes('--changed') ? changedFromGit() : []);
const matches = (file, path) => file === path || file.startsWith(path);
const exactMatches = (file, path) => file === path;
const matched = changedFiles.flatMap(file => (config.features || []).filter(feature => (feature.paths || []).some(path => matches(file, path))).map(feature => feature.name));
const unknown = changedFiles.filter(file => !(config.features || []).some(feature => (feature.paths || []).some(path => matches(file, path))));
// 既存ファイルはprefixで分類するが、保護領域の新規ファイルは完全なpath登録を要求する。
const isProtected = file => (config.policy?.registrationRequiredPrefixes || []).some(prefix => file.startsWith(prefix));
const statusEntries = process.argv.includes('--changed')
  ? execFileSync('git', ['status', '--porcelain=v1'], { cwd: root, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)
  : [];
const newFiles = statusEntries.filter(line => line.startsWith('?? ')).map(line => line.slice(3).replaceAll('\\', '/'));
const unregisteredNewFiles = newFiles.filter(file => isProtected(file)
  && !(config.features || []).some(feature => (feature.paths || []).some(path => exactMatches(file, path))));
for (const file of unregisteredNewFiles) errors.push(`新規入口がfeature registryに未登録です（完全pathを追加してください）: ${file}`);
const featureByName = new Map((config.features || []).map(feature => [feature.name, feature]));
const selectedFeatures = [...new Set(matched)].map(name => featureByName.get(name));
const suggestedChecks = [...new Set(selectedFeatures.flatMap(feature => [...(feature.checks || []), ...(feature.relatedE2E || [])]))];
const recommendation = unknown.length ? (selectedFeatures.length ? 'full' : 'affected') : selectedFeatures.length ? 'affected' : 'fast';
const report = await createReport(root, { name: 'wake7-feature-registry', summary: { features: (config.features || []).length, matched: selectedFeatures.length, unknown: unknown.length, unregisteredNewFiles: unregisteredNewFiles.length, references: (config.features || []).reduce((count, feature) => count + referenceKinds.reduce((total, kind) => total + (Array.isArray(feature?.[kind]) ? feature[kind].length : 0), 0), 0) }, errors, features: config.features, changedFiles, matchedFeatures: selectedFeatures.map(feature => feature.name), unknownChangedFiles: unknown, unregisteredNewFiles, recommendation, suggestedChecks, policy: config.policy });
validateReport(report, 'feature-registry');
const reportPath = join(root, 'build/report/feature-registry.json');
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Feature registry OK: ${selectedFeatures.length} matched, ${unknown.length} unknown; recommend ${recommendation}. Related checks: ${suggestedChecks.join(', ') || 'none'}`);
