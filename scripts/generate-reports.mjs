import { access, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';

// trace:generate の差分実行入口。
// 直接 npm run build した場合は full（従来互換）、check:auto/affected からは
// WAKE7_REPORT_SCOPE=affected を渡して、変更領域に関係する生成器だけを起動する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const scope = process.env.WAKE7_REPORT_SCOPE === 'affected' ? 'affected' : 'full';
const generators = [
  { name: 'trace', command: 'scripts/generate-trace-index.mjs', outputs: ['symbol-index.json', 'flow-map.json'], paths: ['src/', 'scripts/generate-trace-index.mjs', 'scripts/lib/source-analysis.mjs'] },
  { name: 'refactor', command: 'scripts/generate-refactor-report.mjs', outputs: ['refactor-candidates.json'], paths: ['src/', 'scripts/generate-refactor-report.mjs'] },
  { name: 'ui-data', command: 'scripts/generate-ui-data-map.mjs', outputs: ['ui-data-map.json'], paths: ['src/ui/', 'src/runtime/', 'scripts/generate-ui-data-map.mjs'] },
  { name: 'event-wiring', command: 'scripts/generate-event-wiring-map.mjs', outputs: ['event-wiring-map.json'], paths: ['src/', 'scripts/generate-event-wiring-map.mjs'] },
  { name: 'progression-responsibility', command: 'scripts/generate-progression-responsibility.mjs', outputs: ['progression-responsibility.json'], paths: ['src/ui/progression', 'src/ui/clear-flow.js', 'src/runtime/', 'scripts/generate-progression-responsibility.mjs'] },
  { name: 'progression-flow', command: 'scripts/generate-progression-flow-report.mjs', outputs: ['progression-flow-map.json'], paths: ['src/ui/progression', 'src/ui/clear-flow.js', 'src/runtime/', 'scripts/generate-progression-flow-report.mjs'] }
];

const changedFiles = (() => {
  try {
    return execFileSync('git', ['status', '--porcelain=v1', '-z'], { cwd: root, encoding: 'utf8' })
      .split('\0').filter(Boolean).map(entry => entry.slice(3).replaceAll('\\', '/'))
      .filter(file => !file.startsWith('build/report/'));
  } catch { return []; }
})();

const exists = async path => { try { await access(path); return true; } catch { return false; } };
const missing = async generator => {
  for (const output of generator.outputs) if (!(await exists(join(root, 'build/report', output)))) return true;
  return false;
};
const affected = generator => changedFiles.some(file => generator.paths.some(path => file === path || file.startsWith(path)));
const selected = scope === 'full'
  ? generators
  : (await Promise.all(generators.map(async generator => (affected(generator) || await missing(generator)) ? generator : null))).filter(Boolean);

await mkdir(join(root, 'build/report'), { recursive: true });
if (!selected.length) {
  console.log(`Report generation: skipped (no affected reports; ${changedFiles.length ? 'changed files are outside report inputs' : 'working tree unchanged'})`);
  process.exit(0);
}
console.log(`Report generation: ${scope} scope (${selected.map(generator => generator.name).join(', ')})`);
for (const generator of selected) {
  const result = await new Promise(resolve => {
    const child = spawn(process.execPath, [generator.command], { cwd: root, stdio: 'inherit' });
    child.on('close', code => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
  if (result !== 0) process.exit(result);
}
