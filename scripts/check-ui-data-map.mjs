import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// 対応表を現行ソースから再生成し、必須の画面領域が追跡可能なことを確認する。
const run = promisify(execFile);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
await run(process.execPath, [join(root, 'scripts', 'generate-trace-index.mjs')], { cwd: root });
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
