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
const result={name:'primary-browser-e2e',appVersion:version,gitSha:sha,startedAt:new Date().toISOString(),cases:[],consoleErrors:[],passed:false};let server,browser;
const port=await new Promise((resolve,reject)=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});s.on('error',reject);});
const wait=async(page,fn,label)=>{try{await page.waitForFunction(fn,undefined,{timeout:10000});}catch(e){e.message=label+': '+e.message;throw e;}};
const click=(page,id)=>page.locator('#'+id).click({timeout:10000,force:true});
const debugClick=(page,id)=>page.locator('#'+id).dispatchEvent('click');
const vis=(page,id)=>page.locator('#'+id).isVisible();
const snap=page=>page.evaluate(()=>({stage:document.querySelector('#stageNumber')?.textContent?.trim()||'',clear:!document.querySelector('#clearDialog')?.hidden,chain:!document.querySelector('#chainDialog')?.hidden,speedStart:!document.querySelector('#speedStartOverlay')?.hidden,speedPause:!document.querySelector('#speedPauseDialog')?.hidden}));
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
  const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addInitScript(()=>{localStorage.clear();sessionStorage.clear();});
  const page=await context.newPage();page.on('console',m=>{if(m.type()==='error')result.consoleErrors.push(m.text());});page.on('pageerror',e=>result.consoleErrors.push(String(e)));
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
    await page.locator('#'+checkpoint.id).dispatchEvent('click');
    await page.waitForTimeout(180);
    const state=await snap(page);
    assert.equal(state.stage,checkpoint.stage,checkpoint.name+' stage');
    assert.ok(await page.locator('#board').boundingBox(),checkpoint.name+' board');
    result.cases.push({name:checkpoint.name,state});
    await page.locator('#debugClear').dispatchEvent('click');
    await page.waitForTimeout(1300);
    const dialogs=await visibleDialog(page);
    assert.ok(dialogs.length>0,checkpoint.name+' clear dialog');
    result.cases.push({name:checkpoint.name+'-clear-dialog',state:await snap(page),dialogs});
  }
  await page.locator('#debugAcademy20').dispatchEvent('click');await page.waitForTimeout(120);await page.locator('#debugSpeedTraining8').dispatchEvent('click');await wait(page,()=>!document.querySelector('#speedStartOverlay')?.hidden||!document.querySelector('#speedPause')?.hidden,'speed entry');if(await vis(page,'speedBoardStart')){await click(page,'speedBoardStart');}await wait(page,()=>document.querySelector('#speedStartOverlay')?.hidden&&!document.querySelector('#speedPause')?.hidden,'speed start');assert.equal(await vis(page,'speedStartOverlay'),false);const flashes=await page.evaluate(()=>{const a=[];const d=document.querySelector('#masterDialog');const o=new MutationObserver(()=>{if(!d.hidden)a.push(document.querySelector('#masterDialogTitle')?.textContent||'');});o.observe(d,{attributes:true,attributeFilter:['hidden']});window.__speedFlashObserver=o;window.__speedFlashLog=a;return a;});await page.locator('#debugClear').dispatchEvent('click');await wait(page,()=> (document.querySelector('#stageNumber')?.textContent||'').includes('4 / 9'),'speed advances from question 3');await page.waitForTimeout(250);const flashLog=await page.evaluate(()=>{window.__speedFlashObserver?.disconnect();return window.__speedFlashLog||[];});assert.deepEqual(flashLog,[],'speed exam dialog must not flash between questions');result.cases.push({name:'speed-question-3-to-4-no-exam-dialog-flash',state:await snap(page),flashLog});
  assert.deepEqual(result.consoleErrors,[]);result.passed=true;result.finishedAt=new Date().toISOString();await mkdir(reportDir,{recursive:true});await writeFile(reportPath,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}catch(e){result.error=e.message;result.finishedAt=new Date().toISOString();await mkdir(reportDir,{recursive:true});await writeFile(reportPath,JSON.stringify(result,null,2)+'\n');console.error(JSON.stringify(result,null,2));process.exitCode=1;}finally{await browser?.close().catch(()=>{});server?.kill();}










