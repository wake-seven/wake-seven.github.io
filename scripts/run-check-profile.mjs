import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

// fast/affected/fullの実行内容をJSONから解決し、個別検査の終了コードをそのまま返す。
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const execFileAsync=promisify(execFile);
const profileName=process.argv[2]||'fast';
const profiles=JSON.parse(await readFile(join(root,'scripts/check-profiles.json'),'utf8'));
const map=JSON.parse(await readFile(join(root,'scripts/change-check-map.json'),'utf8'));
const packageJson=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
const pipeline=JSON.parse(await readFile(join(root,'scripts/check-pipeline.json'),'utf8'));
const profile=profiles.profiles?.[profileName];
assert.ok(profile,`未知の検査profileです: ${profileName}`);
const changedFiles=(await execFileAsync('git',['status','--porcelain=v1','-z'],{cwd:root})).stdout
  .split('\0').filter(Boolean).map(value=>value.slice(3)).filter(Boolean)
  .map(value=>value.replaceAll('\\','/')).filter(value=>!value.startsWith('build/report/'));
const fullPolicy=profiles.policy?.fullGateRequired||{};
const fullGateRequired=profileName!=='full' && changedFiles.some(file=>(fullPolicy.paths||[]).some(path=>file===path||file.startsWith(path)));
const known=new Set(Object.keys(pipeline.steps||{}));
const runCommand=command=>new Promise(resolve=>{
  const child=spawn(process.platform==='win32'?(process.env.ComSpec||'cmd.exe'):'sh',process.platform==='win32'?['/d','/s','/c',command]:['-c',command],{cwd:root,stdio:'inherit'});
  child.on('close',code=>resolve(code??1));child.on('error',()=>resolve(1));
});
const checkCommand=name=>({
  build:'npm run build',
  'domain-classification':'node scripts/check-domain-classification.mjs',
  version:'node scripts/check-version.mjs',
  'source-format':'node scripts/check-source-format.mjs',
  'board-domain':'npm run test:board-domain',
  'application-services':'npm run test:application-services',
  'application-targets':'node scripts/check-application-targets.mjs',
  state:'node scripts/check-state.mjs',
  'state-classification':'node scripts/check-state-classification.mjs',
  'state-mutations':'node scripts/check-state-mutations.mjs',
  'state-restore':'node scripts/check-state-restore.mjs',
  'browser-flow':'node scripts/check-browser-flow.mjs',
  'dialog-chains':'node scripts/check-dialog-chains.mjs',
  'ui-effects':'node scripts/check-ui-effects.mjs',
  'progression-flows':'node scripts/check-progression-flows.mjs',
  'progression-flow-contract':'node scripts/check-progression-flow-contract.mjs',
  'progression-orchestrators':'node scripts/check-progression-orchestrators.mjs',
  'clear-flow-order':'node scripts/check-clear-flow-order.mjs',
  esm:'node scripts/check-esm.mjs',
  'source-boundaries':'node scripts/check-source-boundaries.mjs',
  'compat-e2e':'node scripts/check-compat-e2e.mjs',
  'browser-e2e':'node scripts/check-browser-e2e.mjs',
  'device-e2e':'node scripts/check-device-e2e.mjs',
  'gate-evidence':'node scripts/check-gate-evidence.mjs',
  'global-access':'node scripts/check-global-access-contract.mjs',
  'state-access-policy':'node scripts/check-state-access-policy.mjs',
  'temporary-exceptions':'node scripts/check-temporary-exception-audit.mjs',
  'state-access-final-audit':'node scripts/check-state-access-final-audit.mjs',
  'navigation-classification':'node scripts/check-navigation-classification.mjs',
  'navigation-final-audit':'node scripts/check-navigation-final-audit.mjs',
  'change-check-map':'node scripts/check-change-check-map.mjs',
  'refactor-baseline-generate':'node scripts/generate-refactor-baseline.mjs',
  'structure-contract-diff':'node scripts/check-structure-contract-diff.mjs',
  'refactor-baseline':'node scripts/check-refactor-baseline.mjs',
  'refactor-budgets':'node scripts/check-refactor-budgets.mjs',
  'esm-dependencies':'node scripts/check-esm-dependencies.mjs',
  'public-esm':'node scripts/check-public-esm.mjs',
  'metrics-update-policy':'node scripts/check-metrics-update.mjs',
  'refactor-policy':'node scripts/check-refactor-policy.mjs',
  trace:'node scripts/check-trace-index.mjs',
  'progression-responsibility':'node scripts/check-progression-responsibility.mjs',
  'ui-data-map':'node scripts/check-ui-data-map.mjs',
  'event-wiring':'node scripts/check-event-wiring.mjs',
  'refactor-report':'node scripts/check-refactor-report.mjs',
  'compat-boundaries':'node scripts/check-compat-boundaries.mjs',
  'unused-files':'node scripts/check-unused-files.mjs',
  'manifest-dependencies':'node scripts/check-manifest-dependencies.mjs',
  'public-symbols':'node scripts/check-public-symbols.mjs',
  'report-schema':'node scripts/check-report-schema.mjs'
}[name]||`npm run check:${name}`);
const validateChecks=checks=>{
  for(const name of checks){assert.ok(name==='build'||known.has(name),`profileに未知の検査があります: ${name}`);assert.ok(name==='build'||checkCommand(name),`profileの検査コマンドがありません: ${name}`);}
};
if(profileName==='full'){
  process.exitCode=await runCommand('npm run check:gate');
}else if(profileName==='fast'){
  validateChecks(profile.steps);console.log(`check:fast: ${profile.description}`);
  for(const name of profile.steps){const code=await runCommand(checkCommand(name));if(code!==0){process.exitCode=code;break;}}
}else{
  let changed=[];try{changed=(await execFileAsync('git',['diff','--name-only','HEAD'],{cwd:root})).stdout.trim().split(/\r?\n/).filter(Boolean).map(value=>value.replaceAll('\\','/'));}catch{}
  const matched=Object.entries(map.areas||{}).filter(([,area])=>changed.some(file=>area.paths.some(path=>file===path||file.startsWith(path))));
  const areas=matched.length?matched:[];
  // 変更がないときは短い確認、未知の変更だけがあるときは影響範囲を広く確認する。
  const checks=[...new Set(matched.length?areas.flatMap(([,area])=>area.affected||[]):changed.length?profile.steps:profiles.profiles.fast.steps)];
  validateChecks(checks);console.log(`check:affected: ${matched.length?matched.map(([name])=>name).join(', '):changed.length?'未分類の変更あり（affected profileを実行）':'変更なし（fast profileを実行）'}`);
  for(const name of checks){const code=await runCommand(checkCommand(name));if(code!==0){process.exitCode=code;break;}}
}
const status=process.exitCode? 'failed':fullGateRequired?'incomplete':'passed';
await (async()=>{await (await import('node:fs/promises')).writeFile(join(root,'build/report/check-profile-result.json'),JSON.stringify({schemaVersion:1,name:'wake7-check-profile-result',generatedAt:new Date().toISOString(),profile:profileName,status,changedFiles,fullGateRequired,requiredChecks:profile.steps,policy:{fullGateRequired:fullPolicy.reason||null}},null,2)+'\n')})();
if(fullGateRequired&&status==='incomplete'){
  console.error(`check:${profileName}: incomplete — ${fullPolicy.reason||'full check:gateが必要です'}`);
  process.exitCode=1;
}
