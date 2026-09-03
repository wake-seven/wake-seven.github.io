import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// アニメーションの実装を、セッション入口・描画・後処理の順に追跡する軽量な索引。
// 毎フレームの実行を再現するのではなく、変更時の調査開始点を安定して提示する。
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const manifest=await readFile(join(root,'scripts','application-manifest.mjs'),'utf8');
const files=[...manifest.matchAll(/'([^']+\.js)'/g)].map(m=>m[1]);
const sources=await Promise.all(files.map(async file=>[file,await readFile(join(root,'src',file),'utf8')]));
const requested=process.argv.slice(2).find(arg=>!arg.startsWith('-'));
const definitions=[
  {name:'start',symbols:['startBoardAnimationSession','animateGroupedSwipe','animateUndoSwipe','animateGuidedBasicRewind','restartWithAnimation']},
  {name:'update',symbols:['requestBoardAnimationFrame','renderSwipeFrame','updateAutoSwipePreview']},
  {name:'finish',symbols:['finishBoardAnimationSession','completeGroupedSwipeAnimation','completeUndoSwipeAnimation']},
  {name:'cancel',symbols:['cancelBoardAnimation','cancelBoardAnimationSession','cancelTileAnimations']}
];
const entries=definitions.filter(entry=>!requested||entry.name===requested||entry.symbols.includes(requested)).map(entry=>({...entry,files:sources.filter(([,source])=>entry.symbols.some(symbol=>source.includes(`function ${symbol}(`))).map(([file])=>file)}));
if(!entries.length)throw new Error(`未知のアニメーション入口です: ${requested}`);
const result={schemaVersion:1,name:'wake7-animation-trace',status:'passed',generatedAt:new Date().toISOString(),sourceRevision:'working-tree',entries,lifecycle:['idle','starting','running','finishing','cancelled'],layerOrder:['tiles','active-animation','application-target','pivot','grips'],commands:{trace:'npm run trace:animation -- <start|update|finish|cancel>',check:'npm run check:animation-contract'}};
const path=join(root,'build','report','animation-trace.json');
await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(result,null,2)+'\n');
if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));else for(const entry of entries)console.log(`アニメ入口: ${entry.name} / ${entry.symbols.join(', ')} / ${entry.files.join(', ')||'未検出'}`);
console.log(`追跡レポート: ${relative(root,path)}`);
