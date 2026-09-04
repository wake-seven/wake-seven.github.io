import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { publishedSourceFiles } from './application-manifest.mjs';

// 対応表を現行ソースから再生成し、必須の画面領域が追跡可能なことを確認する。
const run = promisify(execFile);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const tracePath = join(root, 'build', 'report', 'symbol-index.json');
const manifestPath = join(root, 'scripts', 'application-manifest.mjs');
const sourcePaths = [manifestPath, ...publishedSourceFiles.map(value => join(root, 'src', value))];
const isTraceFresh = async () => {
  try {
    const traceTime = (await stat(tracePath)).mtimeMs;
    const inputTimes = await Promise.all(sourcePaths.map(async path => (await stat(path)).mtimeMs));
    return inputTimes.every(time => time <= traceTime);
  } catch { return false; }
};
// check:gateでは直前のtrace検査が同じ索引を生成しているため、再解析を省略する。
// 単独実行時にソースが新しければ従来どおり再生成し、鮮度は落とさない。
if (!(await isTraceFresh())) {
  await run(process.execPath, [join(root, 'scripts', 'generate-trace-index.mjs')], { cwd: root });
}
await run(process.execPath, [join(root, 'scripts', 'generate-ui-data-map.mjs')], { cwd: root });
const report = JSON.parse(await readFile(join(root, 'build', 'report', 'ui-data-map.json'), 'utf8'));
if (report.schemaVersion !== 1 || !Array.isArray(report.entries) || report.entries.length !== 5) throw new Error('UI/data map schema is invalid.');
for (const entry of report.entries) {
  if (!entry.key || !entry.label || !Array.isArray(entry.elements) || !Array.isArray(entry.data) || !Array.isArray(entry.renderers)) {
    throw new Error(`Invalid UI/data map entry: ${entry.key || '(unnamed)'}`);
  }
  const tracked = [...entry.elements.flatMap(element => element.references || []), ...entry.data, ...entry.renderers]
    .filter(item => item.status !== 'not-found');
  if (!tracked.length) throw new Error(`UI/data map entry has no traceable source: ${entry.key}`);
}
console.log(`UI/data map OK: ${report.entries.length} areas, generated for ${report.generatedForVersion}.`);
