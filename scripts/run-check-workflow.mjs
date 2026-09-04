import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 作業途中と最終確認の入口を固定し、変更種別に応じた追加検査もここで実行する。
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const stage=process.argv[2];
if(!['milestone','release'].includes(stage))throw new Error(`不明な検査段階です: ${stage||'(未指定)'}`);

const run=(command,args,extraEnv={})=>new Promise(resolve=>{
  const child=spawn(command,args,{cwd:root,stdio:'inherit',shell:false,env:{...process.env,...extraEnv}});
  child.on('close',code=>resolve(code??1));
  child.on('error',()=>resolve(1));
});

const contractExit=await run(process.execPath,['scripts/check-execution-contract.mjs']);
if(contractExit!==0)process.exit(contractExit);
const execution=JSON.parse(await readFile(join(root,'build/report/check-execution-contract.json'),'utf8'));
const profile=stage==='release'?'full':'affected';
const primaryExit=await run(process.execPath,['scripts/check-affected.mjs',profile,`--phase=${stage}`],{WAKE7_CHECK_STAGE:stage});
if(primaryExit!==0)process.exit(primaryExit);

// 通常のmilestoneはブラウザE2Eまで。pointer・タッチ・レスポンシブ変更だけ端末E2Eも確認する。
if(stage==='milestone'&&(execution.milestone?.conditionalChecks||[]).includes('device-e2e')){
  const deviceExit=await run(process.execPath,['scripts/check-device-e2e.mjs'],{WAKE7_CHECK_STAGE:stage});
  if(deviceExit!==0)process.exit(deviceExit);
}

console.log(`check:${stage}: 完了 (${profile} profile${stage==='milestone'&&execution.milestone?.conditionalChecks?.includes('device-e2e')?' + device-e2e':''})`);
