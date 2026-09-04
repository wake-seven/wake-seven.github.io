import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { changedPathsFromStatus } from './lib/git-status-paths.mjs';

// 変更ファイルから機能領域を特定し、修正前に読むべき影響範囲を機械的に出力する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const registryPath = join(root, 'scripts/feature-registry.json');
const reportPath = join(root, 'build/report/feature-investigation-changed.json');

const normalizePath = value => String(value ?? '').replaceAll('\\', '/').replace(/^\.\//, '').toLowerCase();
const pathMatches = (pattern, file) => {
  const expected = normalizePath(pattern);
  const actual = normalizePath(file);
  if (!expected) return false;
  if (expected.endsWith('/')) return actual.startsWith(expected);
  if (expected.endsWith('-')) return actual.startsWith(expected);
  return actual === expected;
};

export { changedPathsFromStatus } from './lib/git-status-paths.mjs';

export function matchFeatures(changedFiles, registry) {
  const entries = Array.isArray(registry.features) ? registry.features : [];
  return entries.map(feature => ({
    feature,
    matchedFiles: changedFiles.filter(file => (feature.paths || []).some(path => pathMatches(path, file)))
  })).filter(item => item.matchedFiles.length);
}

function gitStatus() {
  return execFileSync('git', ['status', '--porcelain=v1', '-z'], { cwd: root, encoding: 'utf8' });
}

function compactFeature({ feature, matchedFiles }) {
  const list = field => (Array.isArray(feature[field]) ? feature[field] : feature[field] == null ? [] : [feature[field]])
    .map(item => typeof item === 'object' ? item.path || item.file || item.name : String(item));
  return {
    name: feature.name,
    changedFiles: matchedFiles,
    entry: list('entry'),
    state: list('state'),
    storage: list('storage'),
    dom: list('dom'),
    transitions: list('transitions').concat(list('next')),
    checks: list('checks'),
    e2e: list('e2e').concat(list('relatedE2E')),
    boundaries: list('boundaries'),
    relatedFiles: list('relatedPaths')
  };
}

export function buildReport(changedFiles, registry, generatedAt = new Date().toISOString()) {
  const matched = matchFeatures(changedFiles, registry);
  const covered = new Set(matched.flatMap(item => item.matchedFiles));
  const unknownFiles = changedFiles.filter(file => !covered.has(file));
  const ambiguousFiles = matched.flatMap(item => item.matchedFiles)
    .filter((file, index, all) => all.indexOf(file) !== index)
    .filter((file, index, all) => all.indexOf(file) === index);
  const policy = registry.policy || {};
  const needsFull = unknownFiles.length > 0 && policy.unknownChangedFiles === 'affected'
    ? false
    : unknownFiles.length > 0 || ambiguousFiles.length > 0;
  const activity = matched.length || unknownFiles.length ? 'affected' : 'no-change';
  const status = needsFull ? 'warning' : 'passed';
  const checks = [...new Set(matched.flatMap(item => compactFeature(item).checks))];
  const e2e = [...new Set(matched.flatMap(item => compactFeature(item).e2e))];
  return {
    schemaVersion: 1,
    name: 'wake7-feature-investigation-changed',
    generatedAt,
    status,
    activity,
    changedFiles,
    unknownFiles,
    ambiguousFiles,
    features: matched.map(compactFeature),
    requiredChecks: checks,
    relatedE2E: e2e,
    recommendedProfile: needsFull ? 'full' : activity === 'affected' ? 'affected' : 'fast',
    policy: {
      unknownChangedFiles: policy.unknownChangedFiles || 'affected',
      ambiguousChangedFiles: policy.ambiguousChangedFiles || 'full',
      command: 'npm run investigate:changed'
    }
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    const registry = JSON.parse(await readFile(registryPath, 'utf8'));
    assert.deepEqual(changedPathsFromStatus(' M src/ui/progression-clear-flow.js\0?? scripts/new.mjs\0'), ['src/ui/progression-clear-flow.js', 'scripts/new.mjs']);
    const report = buildReport(['src/ui/progression-clear-flow.js'], registry, 'test');
    assert.equal(report.features.some(item => item.name === 'clear-next'), true);
    // clear-flow系は包括featureと個別featureが重なるため、安全側のfullに昇格する。
    assert.equal(report.recommendedProfile, 'full');
    console.log('Investigate changed self-test OK');
    return;
  }
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  const allChangedFiles = changedPathsFromStatus(gitStatus());
  const ignoredFiles = allChangedFiles.filter(file => file.startsWith('build/report/'));
  const result = buildReport(allChangedFiles.filter(file => !ignoredFiles.includes(file)), registry);
  result.ignoredFiles = ignoredFiles;
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify({ ...result, registry: relative(root, registryPath) }, null, 2) + '\n');
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...result, registry: relative(root, registryPath) }, null, 2));
    return;
  }
  console.log(`影響調査: ${result.activity} / 推奨プロファイル: ${result.recommendedProfile}`);
  console.log(`変更 ${result.changedFiles.length}件、機能 ${result.features.length}件、未知 ${result.unknownFiles.length}件`);
  if (result.requiredChecks.length) console.log(`検査: ${result.requiredChecks.join(', ')}`);
  console.log(`Report: ${relative(root, reportPath)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
