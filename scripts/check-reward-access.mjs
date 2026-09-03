import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 報酬ページの権限だけを短時間で確認する。旧キーは意図的に使わない。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
const reportPath = join(reportDir, 'reward-access-result.json');
const chrome = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Users/user/AppData/Local/Google/Chrome/Application/chrome.exe'].filter(Boolean).find(existsSync);
const result = { schemaVersion: 1, name: 'wake7-reward-access', startedAt: new Date().toISOString(), cases: [], passed: false };
let server; let browser;
try {
  assert.ok(chrome, 'Chrome executable not found; set CHROME_PATH');
  const { chromium } = await import('playwright-core');
  const port = await new Promise((resolve, reject) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); s.on('error', reject); });
  server = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await new Promise(resolve => setTimeout(resolve, 300));
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--disable-gpu'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  const cases = [
    ['index_3D.html', 'pageAccess', { threeD: true }],
    ['all-patterns.html', 'genomeAccess', { masterGoldGranted: true }]
  ];
  for (const [file, attribute, unlock] of cases) {
    await page.addInitScript(value => localStorage.setItem('wake7-state-vnext', JSON.stringify({ version: 1, unlocks: value })), unlock);
    await page.goto(`http://127.0.0.1:${port}/${file}`, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.evaluate(attr => document.documentElement.dataset[attr], attribute), 'granted', `${file} grants access from vnext state`);
    result.cases.push({ name: `${file}:granted`, passed: true });
    await page.reload({ waitUntil: 'domcontentloaded' });
  }
  result.passed = true;
} catch (error) { result.error = error.message; process.exitCode = 1; }
finally { result.finishedAt = new Date().toISOString(); await mkdir(reportDir, { recursive: true }); await writeFile(reportPath, JSON.stringify(result, null, 2) + '\n'); await browser?.close().catch(() => {}); server?.kill(); }
if (!result.passed) console.error(`Reward access check failed. Report: ${reportPath}`); else console.log(`Reward access check passed: ${result.cases.length} cases. Report: ${reportPath}`);
