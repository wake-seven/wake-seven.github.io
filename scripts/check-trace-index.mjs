import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// 索引を毎回再生成して、追跡レポートが現行ソースから作れることを確認する。
const run = promisify(execFile);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
await run(process.execPath, [join(root, 'scripts', 'generate-trace-index.mjs')], { cwd: root });
const symbol = JSON.parse(await readFile(join(root, 'build', 'report', 'symbol-index.json'), 'utf8'));
const flow = JSON.parse(await readFile(join(root, 'build', 'report', 'flow-map.json'), 'utf8'));
if (!symbol.definitions || !Object.keys(symbol.definitions).length) throw new Error('symbol-index.json has no definitions.');
if (!symbol.dom || !Object.keys(symbol.dom).length) throw new Error('symbol-index.json has no DOM references.');
if (!Array.isArray(flow.eventToCommand) || !Array.isArray(flow.dialogTransitions)) throw new Error('flow-map.json is missing flow sections.');
console.log(`Trace index OK: ${Object.keys(symbol.definitions).length} symbols, ${Object.keys(symbol.dom).length} DOM IDs, ${flow.dialogTransitions.length} dialog transitions.`);
