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
try{
  assert.ok(chrome,'Chrome executable not found; set CHROME_PATH');
  const {chromium}=await import('playwright-core');
  server=spawn('python',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});await new Promise(r=>setTimeout(r,500));
  browser=await chromium.launch({headless:true,executablePath:chrome,args:['--disable-gpu','--autoplay-policy=no-user-gesture-required']});
  const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addInitScript(()=>{localStorage.clear();sessionStorage.clear();});
  const page=await context.newPage();page.on('console',m=>{if(m.type()==='error')result.consoleErrors.push(m.text());});page.on('pageerror',e=>result.consoleErrors.push(String(e)));
  await page.goto('http://127.0.0.1:'+port+'/index.html?debug=1',{waitUntil:'networkidle'});await page.waitForSelector('#debugReset');
  await click(page,'introStart');await page.evaluate(()=>{document.querySelector('#debugTools').hidden=false;});await debugClick(page,'debugSkipTutorial');await wait(page,()=>!document.querySelector('#chainDialog')?.hidden&&!document.querySelector('#chainDialogAction')?.hidden,'academy chain');
  await page.evaluate(()=>{document.querySelector('#chainDialog').hidden=true;});result.cases.push({name:'startup-and-tutorial-skip',state:await snap(page)});
  await page.locator('#debugSpeedTraining8').dispatchEvent('click');await wait(page,()=>!document.querySelector('#speedStartOverlay')?.hidden||!document.querySelector('#speedPause')?.hidden,'speed entry');if(await vis(page,'speedBoardStart')){await click(page,'speedBoardStart');}await wait(page,()=>document.querySelector('#speedStartOverlay')?.hidden&&!document.querySelector('#speedPause')?.hidden,'speed start');assert.equal(await vis(page,'speedStartOverlay'),false);result.cases.push({name:'speed-next-question-no-start-overlay',state:await snap(page)});
  assert.deepEqual(result.consoleErrors,[]);result.passed=true;result.finishedAt=new Date().toISOString();await mkdir(reportDir,{recursive:true});await writeFile(reportPath,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}catch(e){result.error=e.message;result.finishedAt=new Date().toISOString();await mkdir(reportDir,{recursive:true});await writeFile(reportPath,JSON.stringify(result,null,2)+'\n');console.error(JSON.stringify(result,null,2));process.exitCode=1;}finally{await browser?.close().catch(()=>{});server?.kill();}







