import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const source=await readFile(join(root,'src','data','core-data.js'),'utf8');
const block=source.match(/const APPLICATION_STAGE_TARGETS=\[(.*?)\];/s)?.[1];
assert.ok(block,'APPLICATION_STAGE_TARGETS declaration is missing.');
const definitions=[...block.matchAll(/\{source:(\d+),targetCells:\[([^\]]+)\]\}/g)]
  .map(([,rawSource,rawCells])=>({source:Number(rawSource),targetCells:rawCells.split(',').map(value=>Number(value.trim()))}));
assert.equal(definitions.length,9,'Application target definitions must contain nine stages.');
const sources=new Set();
for(const [index,{source:stageSource,targetCells}] of definitions.entries()){
  assert.ok(!sources.has(stageSource),`Application source ${stageSource} is duplicated.`);
  sources.add(stageSource);
  assert.equal(targetCells.length,3,`Application ${index+1} must target three cells.`);
  assert.equal(new Set(targetCells).size,3,`Application ${index+1} has duplicate target cells.`);
  assert.ok(targetCells.every(cell=>Number.isInteger(cell)&&cell>=0&&cell<7),
    `Application ${index+1} has a target cell outside the seven-panel board.`);
}
console.log('Validated application target definitions: nine unique two-move sources and three valid cells each.');
