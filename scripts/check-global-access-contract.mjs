import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// 直接参照監査を現行ソースから再生成し、分類件数を検証する。
const root=dirname(dirname(fileURLToPath(import.meta.url)));
await promisify(execFile)(process.execPath,[join(root,'scripts','check-global-access.mjs')],{cwd:root});
const report=JSON.parse(await readFile(join(root,'build','report','global-access.json'),'utf8'));
if(!report.counts||!['gateway','owner','needs-migration'].every(key=>Number.isInteger(report.counts[key])))throw new Error('global-access.json is missing classification counts.');
if(!Array.isArray(report.references))throw new Error('global-access.json is missing references.');
if(Object.values(report.counts).reduce((sum,count)=>sum+count,0)!==report.references.length)throw new Error('Global access counts do not match references.');
console.log(`Global access contract OK: ${report.references.length} references; gateway ${report.counts.gateway}, owner ${report.counts.owner}, needs-migration ${report.counts['needs-migration']}.`);
