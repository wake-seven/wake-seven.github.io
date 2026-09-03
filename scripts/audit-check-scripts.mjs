import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// 検査・テスト・生成スクリプトの役割と重複を、ソースから再生成できる形で記録する。
// これは既存の検査を実行・変更せず、棚卸しだけを行う監査スクリプトである。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const scriptsDir = join(root, 'scripts');
const reportPath = join(root, 'build', 'report', 'script-inventory.json');
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const packageScripts = packageJson.scripts || {};
const files = (await readdir(scriptsDir)).filter(name => /\.(?:mjs|js)$/.test(name));
const selected = files.filter(name => /^(?:check|test|generate|accept|update|trace|public-bundle|state-access-policy|state-classification|progression-entry-points)\b/.test(name.replace(/\.(?:mjs|js)$/, '')));

const readText = async name => readFile(join(scriptsDir, name), 'utf8');
const commandFor = name => Object.entries(packageScripts).find(([, value]) => value.includes(`scripts/${name}`))?.[0] || null;
const comments = source => [...source.matchAll(/(^|\n)\s*\/\/\s*(.+)/g)].slice(0, 3).map(match => match[2].trim()).filter(Boolean);
const paths = (source, pattern) => [...source.matchAll(pattern)].map(match => match[1]).filter(value => value && value.length < 160);
const unique = values => [...new Set(values)];
const purpose = (name, source) => {
  const first = comments(source).find(value => !/^(?:TODO|NOTE)\b/i.test(value));
  return first || name.replace(/\.(?:mjs|js)$/, '').replace(/[-_]/g, ' ');
};

const gatePath = join(root, 'build', 'report', 'check-gate.json');
let gate = { steps: [] };
try { gate = JSON.parse(await readFile(gatePath, 'utf8')); } catch { /* 初回実行時は未生成でも監査を継続する。 */ }
const durations = new Map();
for (const step of gate.steps || []) {
  const match = step.command?.match(/scripts[\\/]([^\\/ ]+\.(?:mjs|js))/);
  if (match) durations.set(match[1], { durationMs: step.durationMs, measuredAt: gate.finishedAt || gate.startedAt || null, source: 'check-gate' });
}

const entries = [];
for (const name of selected.sort()) {
  const source = await readText(name);
  const command = commandFor(name);
  const inputs = unique([
    ...paths(source, /readFile(?:Sync)?\([^,]*join\([^,]+,\s*['"]([^'"]+)/g),
    ...paths(source, /readFile(?:Sync)?\(\s*['"]([^'"]+)/g)
  ]);
  const outputs = unique([
    ...paths(source, /writeFile(?:Sync)?\([^,]*join\([^,]+,\s*['"]([^'"]+)/g),
    ...paths(source, /writeFile(?:Sync)?\(\s*['"]([^'"]+)/g)
  ]);
  const runtime = durations.get(name) || null;
  entries.push({
    file: `scripts/${name}`,
    command: command ? `npm run ${command}` : null,
    category: name.startsWith('check-') ? 'check' : name.startsWith('test-') ? 'test' : name.startsWith('generate-') ? 'generate' : 'support',
    purpose: purpose(name, source),
    inputs,
    outputs,
    runtime,
    overlapKeys: unique([...inputs, ...outputs]),
    integrationCandidate: outputs.some(path => /report|index\.html|build/i.test(path)) ? 'keep-as-pipeline-step' : command ? 'review-for-grouping' : 'internal-only'
  });
}

const overlapGroups = [];
for (let i = 0; i < entries.length; i += 1) for (let j = i + 1; j < entries.length; j += 1) {
  const shared = entries[i].overlapKeys.filter(key => entries[j].overlapKeys.includes(key));
  if (shared.length) overlapGroups.push({ files: [entries[i].file, entries[j].file], shared });
}

const report = {
  schemaVersion: 1,
  name: 'wake7-script-inventory',
  generatedAt: new Date().toISOString(),
  measurement: 'runtime is copied from the latest check-gate report; null means the script was not a gate step',
  selection: 'scripts whose names are check/test/generate or known pipeline support scripts',
  counts: {
    files: entries.length,
    commands: entries.filter(entry => entry.command).length,
    measured: entries.filter(entry => entry.runtime).length,
    overlapGroups: overlapGroups.length
  },
  entries,
  overlapGroups,
  groupingCandidates: entries.filter(entry => entry.integrationCandidate === 'review-for-grouping').map(entry => entry.file),
  deletionCandidates: []
};
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(`Generated script inventory: ${entries.length} files, ${overlapGroups.length} overlap groups`);
console.log(`Report: ${relative(root, reportPath)}`);
