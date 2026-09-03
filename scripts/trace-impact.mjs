import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const execFileAsync = promisify(execFile);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const config = JSON.parse(await readFile(join(root, 'scripts', 'development-entrypoints.json'), 'utf8'));
let inputs = process.argv.slice(2).filter(arg => !arg.startsWith('-'));
if (!inputs.length) {
  try { inputs = (await execFileAsync('git', ['diff', '--name-only', 'HEAD'], { cwd: root })).stdout.trim().split(/\r?\n/).filter(Boolean); } catch { inputs = []; }
}
const matches = Object.entries(config.entrypoints).filter(([name, entry]) => inputs.some(input =>
  input === name || entry.sources.some(source => input.replaceAll('\\', '/') === source) || input === entry.label));
const entrypoints = matches.length ? matches.map(([name, entry]) => ({ name, label: entry.label, sources: entry.sources,
  symbols: entry.symbols, reports: [...new Set([...entry.stateReports, ...entry.domReports, ...entry.e2eReports, ...entry.flowReports])] }))
  : Object.entries(config.entrypoints).map(([name, entry]) => ({ name, label: entry.label, reason: '共通入口・生成物変更の可能性', reports: [...new Set([...entry.stateReports, ...entry.domReports, ...entry.e2eReports, ...entry.flowReports])] }));
const result = { schemaVersion: 1, name: 'wake7-change-impact', generatedAt: new Date().toISOString(), inputs, entrypoints,
  commands: { trace: config.commands.trace, gate: config.commands.gate } };
const reportPath = join(root, 'build', 'report', 'change-impact.json');
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify(result, null, 2) + '\n');
console.log(`変更影響レポート: ${relative(root, reportPath)}`);
for (const entry of entrypoints) console.log(`- ${entry.label}: ${entry.symbols?.join(', ') || entry.reason}`);
