import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// 主要画面要素のイベント登録漏れと表示先の参照漏れを検査する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const run = promisify(execFile);
await run(process.execPath, [join(root, 'scripts', 'build-index.mjs')], { cwd: root });
await run(process.execPath, [join(root, 'scripts', 'generate-event-wiring-map.mjs')], { cwd: root });
const report = JSON.parse(await readFile(join(root, 'build', 'report', 'event-wiring-map.json'), 'utf8'));
if (report.schemaVersion !== 1 || !Array.isArray(report.entries) || report.entries.length !== 5) throw new Error('Event wiring map schema is invalid.');
if (report.missingEvents.length) throw new Error(`Event registration missing: ${report.missingEvents.map(item => `${item.key}/${item.id}`).join(', ')}`);
if (report.unknownDisplayTargets.length) throw new Error(`Event display target missing: ${report.unknownDisplayTargets[0].id}`);
console.log(`Event wiring OK: ${report.entries.length} areas, ${report.entries.flatMap(entry => entry.elements).length} elements.`);
