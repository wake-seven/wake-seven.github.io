import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 公開版をChromeで実操作し、成功時だけ証跡を保存する実ブラウザE2E。
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir=join(root,'build','report');
const reportPath=join(reportDir,'browser-e2e-result.json');
const chrome=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','C:/Users/user/AppData/Local/Google/Chrome/Application/chrome.exe'].filter(Boolean).find(existsSync);
const version=(await readFile(join(root,'src/runtime/runtime.js'),'utf8')).match(/APP_VERSION\s*=\s*['"]([^'"]+)/)?.[1]||'unknown';
const sha=await new Promise(resolve=>{const p=spawn('git',['rev-parse','HEAD'],{cwd:root});let s='';p.stdout.on('data',b=>s+=b);p.on('close',()=>resolve(s.trim()));});
const result={name:'primary-browser-e2e',appVersion:version,gitSha:sha,startedAt:new Date().toISOString(),cases:[],commands:[],consoleErrors:[],passed:false};let server,browser,page;
const port=await new Promise((resolve,reject)=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});s.on('error',reject);});
const wait=async(page,fn,label)=>{try{await page.waitForFunction(fn,undefined,{timeout:10000});}catch(e){e.message=label+': '+e.message;throw e;}};
const vis=(page,id)=>page.locator('#'+id).isVisible();
const snap=page=>page.evaluate(()=>{const text=id=>document.querySelector(id)?.textContent?.trim()||'';const shown=id=>{const el=document.querySelector(id);return !!el&&!el.hidden&&el.getClientRects().length>0;};let nav=null,context=null,flow=null;try{nav=window.WakeSeven?.state?.navigation||null;context=window.WakeSeven?.progression?.context||null;}catch(_){}try{flow=typeof getClearFlowState==='function'?getClearFlowState():null;}catch(_){}return {stage:text('#stageNumber'),clear:shown('#clearDialog'),chain:shown('#chainDialog'),master:shown('#masterDialog'),speedStart:shown('#speedStartOverlay'),speedPause:shown('#speedPauseDialog'),dialogues:[...document.querySelectorAll('.game-dialog-backdrop')].filter(el=>shown('#'+el.id)).map(el=>({id:el.id,title:el.querySelector('h2')?.textContent?.trim()||''})),activeMode:typeof activeMode==='undefined'?null:activeMode,lastStageMode:typeof lastStageMode==='undefined'?null:lastStageMode,clearFlowPhase:flow?.phase||null,clearFlowAction:flow?.action||null,navigation:nav,progressionContext:context,stageTitle:text('#stageTitle'),moves:text('#moveCount'),par:text('#parCount'),lastCommand:window.__e2eLastCommand||null};});
const diff=(before,after)=>{const changed={};for(const key of new Set([...Object.keys(before||{}),...Object.keys(after||{})]))if(JSON.stringify(before?.[key])!==JSON.stringify(after?.[key]))changed[key]={before:before?.[key]??null,after:after?.[key]??null};return changed;};
const track=async(name,action)=>{const before=await snap(page);try{const value=await action();const after=await snap(page);result.commands.push({name,before,after,stateDiff:diff(before,after)});return value;}catch(error){const after=await snap(page).catch(()=>null);result.commands.push({name,before,after,stateDiff:diff(before,after),error:error.message});throw error;}};
const click=(page,id)=>track('click:'+id,()=>page.locator('#'+id).click({timeout:10000,force:true}));
const debugClick=(page,id)=>track('debug-click:'+id,()=>page.locator('#'+id).dispatchEvent('click'));
const visibleDialog=page=>page.evaluate(()=>[...document.querySelectorAll('.game-dialog-backdrop')].filter(el=>!el.hidden&&el.getClientRects().length>0).map(el=>({id:el.id,title:el.querySelector('h2')?.textContent?.trim()||''})));
const stageCheckpoints=[
  {id:'debugIntro2',name:'academy-intro-checkpoint',stage:'入門クラス'},
  {id:'debugBasic11',name:'academy-basic-checkpoint',stage:'応用クラス'},
  {id:'debugAcademy20',name:'academy-development-checkpoint',stage:'発展クラス'},
  {id:'debugTrainingUpper',name:'training-upper-checkpoint',stage:'9 / 9'},
  {id:'debugTrainingMiddle',name:'training-middle-checkpoint',stage:'9 / 9'},
  {id:'debugTrainingLower',name:'training-lower-checkpoint',stage:'9 / 9'},
  {id:'debugExtra14',name:'mastery-sequence-checkpoint',stage:'七転八起'},
  {id:'debugExtra29',name:'mastery-break-checkpoint',stage:'面壁九年'},
  {id:'debugExtra44',name:'mastery-rush-checkpoint',stage:'不立文字'},
  {id:'debugSatori72',name:'satori-checkpoint',stage:'73 / 73'}
];
try{
  assert.ok(chrome,'Chrome executable not found; set CHROME_PATH');
  const {chromium}=await import('playwright-core');
  server=spawn('python',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});await new Promise(r=>setTimeout(r,500));
  browser=await chromium.launch({headless:true,executablePath:chrome,args:['--disable-gpu','--autoplay-policy=no-user-gesture-required']});
  const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addInitScript(()=>{localStorage.clear();sessionStorage.clear();document.addEventListener('click',event=>{const target=event.target?.closest?.('[id]');window.__e2eLastCommand={id:target?.id||null,tag:target?.tagName||null,at:new Date().toISOString()};},true);});
  page=await context.newPage();page.on('console',m=>{if(m.type()==='error')result.consoleErrors.push(m.text());});page.on('pageerror',e=>result.consoleErrors.push(String(e)));
  await page.goto('http://127.0.0.1:'+port+'/index.html?debug=1&debugSpeedIndex=2',{waitUntil:'networkidle'});await page.waitForSelector('#debugReset');
  await click(page,'introStart');await page.evaluate(()=>{document.querySelector('#debugTools').hidden=false;});await debugClick(page,'debugSkipTutorial');await wait(page,()=>!document.querySelector('#chainDialog')?.hidden&&!document.querySelector('#chainDialogAction')?.hidden,'academy chain');
  await page.evaluate(()=>{document.querySelector('#chainDialog').hidden=true;});result.cases.push({name:'startup-and-tutorial-skip',state:await snap(page)});const box=await page.locator('#board').boundingBox();assert.ok(box,'board is visible');await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+80,box.y+box.height/2,{steps:8});await page.mouse.up();await page.waitForTimeout(120);result.cases.push({name:'pointer-swipe-path',state:await snap(page)});
  // 各コースの入口を実ブラウザで開き、盤面と表示中の状態を確認する。
  // デバッグボタンは内部状態を直結するが、画面遷移・描画・ダイアログは実DOMを通る。
  for(const checkpoint of stageCheckpoints){
    await page.evaluate(()=>localStorage.clear());
    await page.reload({waitUntil:'networkidle'});
    await page.waitForSelector('#debugReset');
    // 起動時の開始ダイアログが残ったまま次のデバッグ導線へ進まないよう、
    // 通常の開始操作を一度通してから各コースの確認を始める。
    if(await vis(page,'introDialog')){
      await click(page,'introStart');
      await wait(page,()=>document.querySelector('#introDialog')?.hidden,'startup dialog close');
    }
    await debugClick(page,checkpoint.id);
    await page.waitForTimeout(180);
    const state=await snap(page);
    assert.equal(state.stage,checkpoint.stage,checkpoint.name+' stage');
    assert.ok(await page.locator('#board').boundingBox(),checkpoint.name+' board');
    result.cases.push({name:checkpoint.name,state});
    await debugClick(page,'debugClear');
    await page.waitForTimeout(1300);
    const dialogs=await visibleDialog(page);
    assert.ok(dialogs.length>0,checkpoint.name+' clear dialog');
    result.cases.push({name:checkpoint.name+'-clear-dialog',state:await snap(page),dialogs});
    if(checkpoint.id==='debugTrainingUpper'){
      const before=await snap(page);await click(page,'clearNext');
      await wait(page,()=>document.querySelector('#clearDialog')?.hidden,'clear next action');
      const after=await snap(page);assert.ok(after.stage!==before.stage||after.chain||after.speedStart||after.speedPause,'clear next must advance or open the next route');
      result.cases.push({name:'primary-clear-next-action',before,after});
    }
  }
  await debugClick(page,'debugAcademy20');await page.waitForTimeout(120);await debugClick(page,'debugSpeedTraining8');await wait(page,()=>!document.querySelector('#speedStartOverlay')?.hidden||!document.querySelector('#speedPause')?.hidden,'speed entry');if(await vis(page,'speedBoardStart')){await click(page,'speedBoardStart');}await wait(page,()=>document.querySelector('#speedStartOverlay')?.hidden&&!document.querySelector('#speedPause')?.hidden,'speed start');assert.equal(await vis(page,'speedStartOverlay'),false);await page.evaluate(()=>{const a=[];const d=document.querySelector('#masterDialog');const o=new MutationObserver(()=>{if(!d.hidden)a.push(document.querySelector('#masterDialogTitle')?.textContent||'');});o.observe(d,{attributes:true,attributeFilter:['hidden']});window.__speedFlashObserver=o;window.__speedFlashLog=a;});await debugClick(page,'debugClear');await wait(page,()=> (document.querySelector('#stageNumber')?.textContent||'').includes('4 / 9'),'speed advances from question 3');await page.waitForTimeout(250);const flashLog=await page.evaluate(()=>{window.__speedFlashObserver?.disconnect();return window.__speedFlashLog||[];});assert.deepEqual(flashLog,[],'speed exam dialog must not flash between questions');result.cases.push({name:'speed-question-3-to-4-no-exam-dialog-flash',state:await snap(page),flashLog});
  await page.reload({waitUntil:'networkidle'});await wait(page,()=>document.querySelector('#speedStartOverlay')?.hidden,'speed reload restore');
  assert.equal(await vis(page,'speedStartOverlay'),false);result.cases.push({name:'speed-reload-restoration',state:await snap(page)});
  await page.evaluate(()=>{document.querySelector('#clearDialog')?.setAttribute('hidden','');document.querySelector('#masterDialog')?.setAttribute('hidden','');});
  if(await vis(page,'introDialog')){await click(page,'introStart');await wait(page,()=>document.querySelector('#introDialog')?.hidden,'intro close for side modes');}
  await page.evaluate(()=>{document.querySelector('#menuToggle')?.removeAttribute('hidden');document.querySelector('#menuToggle')?.style.setProperty('display','block');});
  await debugClick(page,'menuToggle');await wait(page,()=>document.querySelector('#appMenu')?.hidden===false,'menu open for free mode');
  await debugClick(page,'freeMode');await wait(page,()=>document.querySelector('#board')?.getClientRects().length>0,'free mode board');result.cases.push({name:'free-mode-entry',state:await snap(page)});
  await debugClick(page,'menuToggle');await debugClick(page,'customMode');await wait(page,()=>document.querySelector('#playCustomBoard')?.hidden===false,'custom maker entry');result.cases.push({name:'custom-mode-entry',state:await snap(page)});
  assert.deepEqual(result.consoleErrors,[]);result.passed=true;result.finishedAt=new Date().toISOString();await mkdir(reportDir,{recursive:true});await writeFile(reportPath,JSON.stringify(result,null,2)+'\n');console.log(`browser E2E passed: ${result.cases.length} cases, console errors 0 (details: ${reportPath})`);
}catch(e){result.error=e.message;result.finishedAt=new Date().toISOString();if(page){result.failure={url:page.url(),diagnostics:await snap(page).catch(error=>({error:error.message})),lastCommand:result.commands.at(-1)||null};try{const stamp=new Date().toISOString().replaceAll(':','-');const screenshotPath=join(reportDir,'browser-e2e-failure-'+stamp+'.png');await mkdir(reportDir,{recursive:true});await page.screenshot({path:screenshotPath,fullPage:true});result.failure.screenshot=screenshotPath;}catch(error){result.failure.screenshotError=error.message;}}await mkdir(reportDir,{recursive:true});await writeFile(reportPath,JSON.stringify(result,null,2)+'\n');console.error(JSON.stringify(result,null,2));process.exitCode=1;}finally{await browser?.close().catch(()=>{});server?.kill();}










