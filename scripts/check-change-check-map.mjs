import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// 変更領域の対応表を、検査名・昇格条件・E2Eの漏れなく維持する。
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const map=JSON.parse(await readFile(join(root,'scripts/change-check-map.json'),'utf8'));
const pipeline=JSON.parse(await readFile(join(root,'scripts/check-pipeline.json'),'utf8'));
const packageJson=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
const known=new Set(Object.keys(pipeline.steps||{}));
const errors=[];
if(map.schemaVersion!==1)errors.push('change-check-map schemaVersionが不正です');
const tiers=['fast','affected','full'];
if(JSON.stringify(map.tiers)!==JSON.stringify(tiers))errors.push('tierはfast/affected/fullの順で定義してください');
const areas=map.areas||{};
if(Object.keys(areas).length<5)errors.push('変更領域が不足しています');
for(const [name,area] of Object.entries(areas)){
  if(!Array.isArray(area.paths)||!area.paths.length)errors.push(`${name}: pathsがありません`);
  for(const tier of tiers){
    if(!Array.isArray(area[tier])||!area[tier].length)errors.push(`${name}: ${tier}検査がありません`);
    for(const check of area[tier]||[])if(!known.has(check))errors.push(`${name}/${tier}: 未知の検査 ${check}`);
  }
  for(const check of area.affected||[])if(!area.full.includes(check))errors.push(`${name}: affectedの${check}がfullに含まれていません`);
  for(const check of area.fast||[])if(!area.affected.includes(check))errors.push(`${name}: fastの${check}がaffectedに含まれていません`);
  if(!Array.isArray(area.promoteToAffectedWhen)||!area.promoteToAffectedWhen.length)errors.push(`${name}: affected昇格条件がありません`);
  if(!Array.isArray(area.promoteToFullWhen)||!area.promoteToFullWhen.length)errors.push(`${name}: full昇格条件がありません`);
  if(!Array.isArray(area.relatedE2E)||!area.relatedE2E.length)errors.push(`${name}: 関連E2Eがありません`);
  for(const check of area.relatedE2E||[])if(!known.has(check)&&!packageJson.scripts?.[`check:${check}`])errors.push(`${name}: 未知の関連E2E ${check}`);
}
const report={schemaVersion:1,name:'wake7-change-check-map',generatedAt:new Date().toISOString(),status:errors.length?'failed':'passed',summary:{areas:Object.keys(areas).length,tiers,errors:errors.length},areas:Object.fromEntries(Object.entries(areas).map(([name,area])=>[name,{paths:area.paths,fast:area.fast,affected:area.affected,full:area.full,relatedE2E:area.relatedE2E}])),errors,warnings:[]};
const reportPath=join(root,'build/report/change-check-map.json');await mkdir(dirname(reportPath),{recursive:true});await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
if(errors.length){console.error(errors.join('\n'));console.error(`Report: ${relative(root,reportPath)}`);process.exitCode=1;}else console.log(`Change check map OK: ${Object.keys(areas).length} areas, fast/affected/full mappings validated.`);
