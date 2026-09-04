import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 端末差分を補うChrome E2E。通常の導線E2Eとは分け、touch/viewport固有の契約を検証する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
const reportPath = join(reportDir, 'device-e2e-result.json');
const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Users/user/AppData/Local/Google/Chrome/Application/chrome.exe'
].filter(Boolean).find(existsSync);
const result = {
  schemaVersion: 1,
  name: 'device-variation-browser-e2e',
  executionProfile: 'device-serial',
  serial: true,
  startedAt: new Date().toISOString(),
  contexts: [],
  passed: false,
  consoleErrors: []
};

const wait = async (page, predicate, label) => {
  try {
    await page.waitForFunction(predicate, undefined, { timeout: 10000 });
  } catch (error) {
    error.message = `${label}: ${error.message}`;
    throw error;
  }
};

const visible = (page, id) => page.locator(`#${id}`).isVisible();
const snapshot = page => page.evaluate(() => {
  const shown = id => {
    const node = document.querySelector(`#${id}`);
    return Boolean(node && !node.hidden && node.getClientRects().length);
  };
  return {
    dialogs: [...document.querySelectorAll('.game-dialog-backdrop')]
      .filter(node => !node.hidden && node.getClientRects().length)
      .map(node => node.id),
    clearDialog: shown('clearDialog'),
    stage: document.querySelector('#stageNumber')?.textContent?.trim() || '',
    boardClass: document.querySelector('#board')?.className?.baseVal || '',
    activeMode: typeof activeMode === 'undefined' ? null : activeMode,
    clearFlowPhase: typeof getClearFlowState === 'function' ? getClearFlowState()?.phase || null : null
  };
});

const click = async (page, id) => page.locator(`#${id}`).click({ timeout: 10000, force: true });
const debugClick = async (page, id) => page.locator(`#${id}`).dispatchEvent('click');

const prepare = async page => {
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#debugReset');
  if (await visible(page, 'introDialog')) {
    await click(page, 'introStart');
    await wait(page, () => document.querySelector('#introDialog')?.hidden, 'startup dialog');
  }
  await page.evaluate(() => { document.querySelector('#debugTools').hidden = false; });
  await debugClick(page, 'debugSkipTutorial');
  await wait(page, () => !document.querySelector('#chainDialog')?.hidden, 'academy chain');
  await page.evaluate(() => { document.querySelector('#chainDialog').hidden = true; });
};

const firstGripPoint = page => page.locator('#board .grip-marker').first().evaluate(marker => {
  const board = document.querySelector('#board');
  const local = board.createSVGPoint();
  local.x = 0;
  local.y = 0;
  const screen = local.matrixTransform(marker.getCTM()).matrixTransform(board.getScreenCTM());
  return { x: screen.x, y: screen.y };
});

const boardPoint = page => page.locator('#board .pivot').first().boundingBox().then(box => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2
}));

const dispatchPointer = (page, type, point, pointerId) => page.evaluate(({ type, point, pointerId }) => {
  const board = document.querySelector('#board');
  board.dispatchEvent(new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId,
    pointerType: 'touch',
    button: 0,
    buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
    clientX: point.x,
    clientY: point.y
  }));
}, { type, point, pointerId });

const swipe = async (page, pointerId) => {
  const start = await firstGripPoint(page);
  const pivot = await boardPoint(page);
  await dispatchPointer(page, 'pointerdown', start, pointerId);
  await dispatchPointer(page, 'pointermove', { x: pivot.x + 48, y: pivot.y }, pointerId);
  await dispatchPointer(page, 'pointerup', { x: pivot.x + 48, y: pivot.y }, pointerId);
  await page.waitForTimeout(160);
};

const runContext = async (browser, config) => {
  const context = await browser.newContext({
    viewport: config.viewport,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: config.deviceScaleFactor
  });
  const page = await context.newPage();
  const contextResult = { name: config.name, config, cases: [], consoleErrors: [] };
  page.on('console', message => {
    if (message.type() === 'error') contextResult.consoleErrors.push(message.text());
  });
  page.on('pageerror', error => contextResult.consoleErrors.push(String(error)));
  try {
    await page.goto(`http://127.0.0.1:${port}/index.html?debug=1`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#debugReset');

    await prepare(page);
    const touchContract = await page.evaluate(() => {
      const board = document.querySelector('#board');
      const body = getComputedStyle(document.body);
      const boardStyle = getComputedStyle(board);
      const css = [...document.styleSheets].flatMap(sheet => {
        try { return [...sheet.cssRules].map(rule => rule.cssText); } catch (_) { return []; }
      }).join('\n');
      return {
        boardTouchAction: boardStyle.touchAction,
        bodyUserSelect: body.userSelect,
        hasSafeAreaRule: css.includes('safe-area-inset'),
        hasHoverRules: css.includes(':hover'),
        hasTouchMedia: css.includes('(hover: none)') || css.includes('(pointer: coarse)'),
        disablesSelectionOutsideDebug: css.includes('body:not(.debug-mode)') && /user-select\s*:\s*none/.test(css)
      };
    });
    assert.equal(touchContract.boardTouchAction, 'none', `${config.name}: board touch-action`);
    assert.equal(touchContract.disablesSelectionOutsideDebug, true, `${config.name}: selection guard outside debug`);
    assert.equal(touchContract.hasSafeAreaRule, true, `${config.name}: safe-area rule`);
    assert.equal(touchContract.hasHoverRules, true, `${config.name}: hover rule`);
    contextResult.cases.push({ name: 'touch-viewport-css-contract', state: await snapshot(page), touchContract });

    const touchBefore = await snapshot(page);
    await swipe(page, 1101);
    const touchAfter = await snapshot(page);
    assert.equal(touchAfter.clearDialog, false, `${config.name}: touch swipe must not open clear dialog`);
    contextResult.cases.push({ name: 'touch-swipe', before: touchBefore, after: touchAfter });

    await prepare(page);
    const cancelPoint = await firstGripPoint(page);
    await dispatchPointer(page, 'pointerdown', cancelPoint, 1201);
    await dispatchPointer(page, 'pointercancel', cancelPoint, 1201);
    await page.waitForTimeout(100);
    const cancelled = await page.evaluate(() => ({
      axisGuides: document.querySelectorAll('#board .axis-guide').length,
      spinning: document.querySelector('#board')?.classList.contains('spinning') || false
    }));
    assert.equal(cancelled.axisGuides, 0, `${config.name}: pointercancel axis guide`);
    assert.equal(cancelled.spinning, false, `${config.name}: pointercancel spinning`);
    contextResult.cases.push({ name: 'pointercancel', state: await snapshot(page), cancelled });

    await prepare(page);
    await swipe(page, 1301);
    await swipe(page, 1302);
    const consecutive = await snapshot(page);
    assert.equal(consecutive.clearDialog, false, `${config.name}: consecutive touch`);
    assert.equal(consecutive.boardClass.includes('spinning'), false, `${config.name}: consecutive swipe settled`);
    contextResult.cases.push({ name: 'consecutive-touch-swipes', state: consecutive });

    await prepare(page);
    await debugClick(page, 'debugClear');
    await debugClick(page, 'debugClear');
    await page.waitForTimeout(300);
    const duringReentry = await snapshot(page);
    assert.equal(duringReentry.dialogs.length, 0, `${config.name}: no dialog during clear animation re-entry`);
    await wait(page, () => !document.querySelector('#clearDialog')?.hidden, 'clear animation re-entry');
    const afterReentry = await snapshot(page);
    assert.deepEqual(afterReentry.dialogs, ['clearDialog'], `${config.name}: one dialog after re-entry`);
    contextResult.cases.push({ name: 'animation-reentry-is-idempotent', during: duringReentry, after: afterReentry });

    await prepare(page);
    await debugClick(page, 'debugTrainingUpper');
    await page.waitForTimeout(180);
    await debugClick(page, 'debugClear');
    await wait(page, () => !document.querySelector('#clearDialog')?.hidden, 'clear dialog before reload');
    await page.reload({ waitUntil: 'networkidle' });
    await wait(page, () => !document.querySelector('#clearDialog')?.hidden, 'clear dialog reload restore');
    const restored = await snapshot(page);
    assert.equal(restored.clearDialog, true, `${config.name}: clear dialog restores after reload`);
    contextResult.cases.push({ name: 'dialog-reload-restoration', state: restored });
    assert.deepEqual(contextResult.consoleErrors, [], `${config.name}: console errors`);
    return contextResult;
  } finally {
    await context.close();
  }
};

let server;
let browser;
const port = await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.listen(0, '127.0.0.1', () => {
    const value = probe.address().port;
    probe.close(() => resolve(value));
  });
  probe.on('error', reject);
});

try {
  assert.ok(chrome, 'Chrome executable not found; set CHROME_PATH');
  const { chromium } = await import('playwright-core');
  server = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await new Promise(resolve => setTimeout(resolve, 500));
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--disable-gpu', '--autoplay-policy=no-user-gesture-required'] });
  for (const config of [
    { name: 'mobile-iphone', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 },
    { name: 'mobile-android', viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 },
    { name: 'tablet', viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2 }
  ]) {
    result.contexts.push(await runContext(browser, config));
  }
  result.consoleErrors = result.contexts.flatMap(context => context.consoleErrors);
  assert.deepEqual(result.consoleErrors, []);
  result.passed = true;
  result.finishedAt = new Date().toISOString();
  await mkdir(reportDir, { recursive: true });
  await writeFile(reportPath, JSON.stringify(result, null, 2) + '\n');
  console.log(`device E2E passed: ${result.contexts.reduce((sum, context) => sum + context.cases.length, 0)} cases across ${result.contexts.length} touch contexts (details: ${reportPath})`);
} catch (error) {
  result.error = error.message;
  result.finishedAt = new Date().toISOString();
  result.consoleErrors = result.contexts.flatMap(context => context.consoleErrors);
  await mkdir(reportDir, { recursive: true });
  await writeFile(reportPath, JSON.stringify(result, null, 2) + '\n');
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  server?.kill();
}
