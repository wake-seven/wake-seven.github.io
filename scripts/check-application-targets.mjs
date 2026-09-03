import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const source=await readFile(join(root,'src','data','core-data.js'),'utf8');
const runtime=await readFile(join(root,'src','runtime','runtime.js'),'utf8');
const academySupport=await readFile(join(root,'src','ui','progression-academy-support.js'),'utf8');
const board=await readFile(join(root,'src','ui','board-ui.js'),'utf8');
const animation=await readFile(join(root,'src','ui','board-animation.js'),'utf8');
const template=await readFile(join(root,'src','index.template.html'),'utf8');
const block=source.match(/const APPLICATION_STAGE_TARGETS=\[(.*?)\];/s)?.[1];
assert.ok(block,'APPLICATION_STAGE_TARGETS declaration is missing.');
const definitions=[...block.matchAll(/\{source:(\d+),targetCells:\[([^\]]+)\]\}/g)]
  .map(([,rawSource,rawCells])=>({source:Number(rawSource),targetCells:rawCells.split(',').map(value=>Number(value.trim()))}));
assert.equal(definitions.length,9,'Application target definitions must contain nine stages.');
assert.deepEqual(definitions.map(({source})=>source),[1,0,2,3,4,5,6,7,8],
  'Application must use the same nine two-move puzzles as the basic class.');
const sources=new Set();
for(const [index,{source:stageSource,targetCells}] of definitions.entries()){
  assert.ok(!sources.has(stageSource),`Application source ${stageSource} is duplicated.`);
  sources.add(stageSource);
  assert.equal(targetCells.length,3,`Application ${index+1} must target three cells.`);
  assert.equal(new Set(targetCells).size,3,`Application ${index+1} has duplicate target cells.`);
  assert.ok(targetCells.every(cell=>Number.isInteger(cell)&&cell>=0&&cell<7),
    `Application ${index+1} has a target cell outside the seven-panel board.`);
}
assert.deepEqual(definitions[0].targetCells,[0,1,4],
  'Application 1 target cells must remain the explicitly reviewed [0,1,4].');
assert.deepEqual(definitions[8].targetCells,[0,3,4],
  'Application 9 target cells must remain the explicitly reviewed [0,3,4].');

// コースの位置は個別の数値で複製せず、応用9問の直後から発展を開始する。
assert.match(source,/const APPLICATION_STAGE_COUNT=9;/,
  'Application stage count must be nine.');
assert.match(source,/const DEVELOPMENT_STAGE_START=APPLICATION_STAGE_START\+APPLICATION_STAGE_COUNT;/,
  'Development start must follow the application class.');
assert.match(runtime,/id:'application',[\s\S]{0,180}total:APPLICATION_STAGE_COUNT/,
  'Primary navigation must use the application stage count.');
assert.match(runtime,/developmentStart:DEVELOPMENT_STAGE_START,[\s\S]{0,80}developmentTotal:DEVELOPMENT_STAGE_COUNT/,
  'Progression policy must receive the derived development start.');

// 開始演出と本編は同じデータ／枠描画経路を使う。ここが別実装になると、
// 応用1だけ正しく見えて後続問題で目標がずれる退行を早期に検出できる。
assert.match(board,/applicationWelcome:academyBoardStep\('application'/,
  'Application welcome must use the shared academy board renderer.');
assert.match(board,/variant==='application'[\s\S]{0,260}initialStage\.targetCells/,
  'Application welcome animation must render its target cells from stage data.');
assert.match(academySupport,/function bindApplicationTargetTiles\(\)[\s\S]{0,260}targetCells\|\|\[\]/,
  'Application target panels must be bound from the active stage data.');
assert.match(academySupport,/function renderApplicationTargetCells\(\)[\s\S]{0,360}applicationTargetTiles\.has\(tile\)/,
  'Application target rendering must preserve physical panel identity.');
assert.equal((animation.match(/function renderApplicationTargetLayer\(/g)||[]).length,1,
  'Application target overlay renderer must have one definition.');
assert.match(animation,/function renderApplicationTargetLayer\([\s\S]{0,600}clearApplicationTargetLayer\(root\)/,
  'Target overlay rendering must clear the previous layer before creating one.');
assert.match(animation,/function createSwipeGroup\([\s\S]{0,500}clearApplicationTargetLayer\(svg\)/,
  'Swipe start must remove the static target overlay before cloning panels.');
assert.match(animation,/function placeSwipeTilesOnTop\([\s\S]{0,420}insertBefore\(tile,anchor\)/,
  'Direct swipe must have a single renderer-owned tile ordering helper.');
assert.match(board,/removeApplicationTargetOverlay\(\);[\s\S]{0,260}placeSwipeTilesOnTop\(svg,items\)/,
  'Direct swipe must restore active tile order after target rendering.');
assert.match(board,/function paint\(\)[\s\S]{0,800}renderApplicationTargetCells\(\)/,
  'Board paint must regenerate the static target overlay after a swipe.');
assert.match(board,/function setPosition\([\s\S]{0,1200}bindApplicationTargetTiles\(\);[\s\S]{0,500}paint\(\);/,
  'Loading a new position must rebind targets before repainting.');
assert.match(template,/\.application-target[^\{]*\{[^}]*stroke:/,
  'Published template must define visible application target styling.');
console.log('Validated application targets: nine basic-class puzzles, reviewed first/last targets, derived progression, welcome animation, and swipe overlay lifecycle.');
