import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeReport } from './lib/report.mjs';

const root=join(fileURLToPath(new URL('.',import.meta.url)),'..');
const source=await readFile(join(root,'src/ui/progression-flow-contract.js'),'utf8');
const match=source.match(/const PROGRESSION_FLOW_CONTRACT=Object\.freeze\((\[[\s\S]*?\])\);/);
if(!match)throw new Error('進行フロー契約の宣言が見つかりません');
const entries=Function(`"use strict";return (${match[1]});`)();
if(!Array.isArray(entries)||entries.length<8)throw new Error('進行フロー契約が不足しています');
const report={generatedAt:new Date().toISOString(),source:'src/ui/progression-flow-contract.js',entries};
const dir=join(root,'build/report');await mkdir(dir,{recursive:true});
await writeReport(join(dir,'progression-flow-map.json'),report);
console.log(`Generated progression flow report: ${entries.length} transitions`);
