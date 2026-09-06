const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const URL = 'http://127.0.0.1:8765/index.rebuild.html';
const OUTPUT = __dirname;
const UPDATE_SCREENSHOTS = process.env.UPDATE_P2_SCREENSHOTS === '1';
const VIEWBOX = { x: 14, y: 0, width: 293, height: 310 };
const AXES = [
  { pivot:[160.3007,101], grip:[160.3007,69] },
  { pivot:[113.5354,128], grip:[85.8226,112] },
  { pivot:[207.0661,128], grip:[234.7789,112] },
  { pivot:[113.5354,182], grip:[85.8226,198] },
  { pivot:[207.0661,182], grip:[234.7789,198] },
  { pivot:[160.3007,209], grip:[160.3007,241] },
];

async function clientPoint(page, logical) {
  const box = await page.locator('#w7-board').boundingBox();
  assert(box, 'board has no bounding box');
  return {
    x: box.x + (logical[0] - VIEWBOX.x) * box.width / VIEWBOX.width,
    y: box.y + (logical[1] - VIEWBOX.y) * box.height / VIEWBOX.height,
  };
}

function turnPoint(axisIndex, degrees, radius = 32) {
  const axis = AXES[axisIndex];
  const startAngle = Math.atan2(axis.grip[1] - axis.pivot[1], axis.grip[0] - axis.pivot[0]);
  const angle = startAngle + degrees * Math.PI / 180;
  return [axis.pivot[0] + radius * Math.cos(angle), axis.pivot[1] + radius * Math.sin(angle)];
}

async function mouseDrag(page, axisIndex, degrees, options = {}) {
  const start = await clientPoint(page, AXES[axisIndex].grip);
  const endLogical = turnPoint(axisIndex, degrees, options.radius ?? 32);
  const end = await clientPoint(page, endLogical);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let step = 1; step <= 8; step += 1) {
    const partial = turnPoint(axisIndex, degrees * step / 8, options.radius ?? 32);
    const point = await clientPoint(page, partial);
    await page.mouse.move(point.x, point.y);
  }
  if (options.beforeRelease) await options.beforeRelease();
  if (options.cancel) {
    await page.locator('#w7-board').dispatchEvent('pointercancel', { pointerId: 1, pointerType:'mouse', clientX:end.x, clientY:end.y });
  }
  await page.mouse.up();
}

async function touchDrag(page, cdp, axisIndex, degrees) {
  const start = await clientPoint(page, AXES[axisIndex].grip);
  await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:start.x, y:start.y, id:1, radiusX:5, radiusY:5, force:1 }] });
  for (let step = 1; step <= 8; step += 1) {
    const logical = turnPoint(axisIndex, degrees * step / 8);
    const point = await clientPoint(page, logical);
    await cdp.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{ x:point.x, y:point.y, id:1, radiusX:5, radiusY:5, force:1 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
}

async function snapshot(page) {
  return page.locator('#w7-board').evaluate(board => ({
    phase: board.dataset.phase,
    state: Number(board.dataset.state),
    history: Number(board.dataset.historyLength),
    invariant: board.dataset.invariant,
    selftest: board.dataset.selftest,
    axes: board.querySelectorAll('.w7-axis-grip').length,
    cells: Array.from(board.querySelectorAll('.w7-cell')).map(cell => Number(cell.dataset.orientation)),
  }));
}

async function waitReady(page) {
  await page.waitForFunction(() => document.querySelector('#w7-board')?.dataset.phase === 'ready');
}

async function saveEvidenceScreenshot(page, filename) {
  if (UPDATE_SCREENSHOTS) await page.screenshot({ path:path.join(OUTPUT, filename), fullPage:true });
}

async function openPage(context) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(URL);
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch({ channel:'chrome', headless:true });
  const results = {};
  try {
    const pcContext = await browser.newContext({ viewport:{ width:1440, height:1000 } });
    const { page, errors } = await openPage(pcContext);
    assert.equal((await snapshot(page)).phase, 'arriving', 'boot must own the arriving phase');
    const arrivalStart = await clientPoint(page, AXES[0].grip);
    await page.mouse.click(arrivalStart.x, arrivalStart.y);
    await waitReady(page);
    assert.deepEqual(await snapshot(page), { phase:'ready', state:31, history:0, invariant:'passed', selftest:'passed', axes:6, cells:[1,1,0,1,0,0,0] }, 'arrival tap changed state');
    assert.equal(await page.locator('#w7-board').evaluate(board => getComputedStyle(board).touchAction), 'none', 'touch scrolling is not suppressed');
    await saveEvidenceScreenshot(page, 'pc-1440x1000-ready.png');

    await mouseDrag(page, 0, 10);
    await waitReady(page);
    assert.equal((await snapshot(page)).state, 31, 'short drag must cancel');
    assert.equal((await snapshot(page)).history, 0, 'short drag entered history');

    await mouseDrag(page, 0, -72, { cancel:true, beforeRelease:async () => {
      assert.equal((await snapshot(page)).phase, 'dragging');
      assert.equal((await snapshot(page)).state, 31, 'drag preview mutated persistent state');
      assert.equal((await snapshot(page)).history, 0, 'drag preview mutated history');
      assert.equal(await page.locator('#w7-board-moves').textContent(), '1', 'move preview was not shown');
      assert.equal(await page.locator('#w7-board-remaining').textContent(), '0', 'remaining preview was not shown');
      assert.equal(await page.locator('.w7-rotating-layer .w7-cell').count(), 3, 'rotating cells are not grouped in the foreground');
      assert.equal(await page.locator('.w7-rotating-layer + .w7-axis-layer').count(), 1, 'rotating layer is not directly behind the controls');
      assert.equal(await page.locator('.w7-rotating-layer .w7-cell--dragging').count(), 0, 'normal rotation unexpectedly uses a purple target style');
      assert.equal(await page.locator('.w7-rotating-layer .w7-cell-hex').first().evaluate(path => getComputedStyle(path).strokeWidth), '1.5px', 'rotation changed the normal panel border');
      await saveEvidenceScreenshot(page, 'pc-1440x1000-drag-preview.png');
    } });
    await waitReady(page);
    assert.equal((await snapshot(page)).state, 31, 'pointercancel changed state');
    assert.equal((await snapshot(page)).history, 0, 'pointercancel entered history');

    await mouseDrag(page, 1, 100, { radius:240 });
    await waitReady(page);
    assert.equal((await snapshot(page)).history, 1, 'outside release did not safely commit');
    assert.equal((await snapshot(page)).invariant, 'passed');
    await page.locator('#w7-board-undo').click();
    assert.equal(await page.locator('#w7-board-undo').isDisabled(), true, 'Undo must lock controls while running');
    assert.equal(await page.locator('#w7-board-restart').isDisabled(), true, 'Restart must be rejected during Undo');
    await page.waitForFunction(() => document.querySelectorAll('.w7-rotating-layer .w7-cell').length === 3);
    assert.equal(await page.locator('.w7-rotating-layer .w7-cell').count(), 3, 'Undo did not lift its three rotating cells');
    await waitReady(page);
    assert.equal((await snapshot(page)).state, 31, 'Undo did not restore outside-release move');

    await mouseDrag(page, 0, 82);
    await waitReady(page);
    assert.equal((await snapshot(page)).history, 1, 'positive direction was not committed');
    await page.locator('#w7-board-restart').click();
    await waitReady(page);
    assert.deepEqual({ state:(await snapshot(page)).state, history:(await snapshot(page)).history }, { state:31, history:0 }, 'Restart did not restore initial state');

    await mouseDrag(page, 0, -120);
    assert.equal((await snapshot(page)).phase, 'rotating', 'committed drag must own the rotating phase');
    const rapidTap = await clientPoint(page, AXES[4].grip);
    await page.mouse.click(rapidTap.x, rapidTap.y);
    await page.waitForFunction(() => document.querySelector('#w7-board')?.dataset.phase === 'celebrating');
    assert.equal((await snapshot(page)).phase, 'celebrating', 'solving move did not enter clear effect');
    const clearState = await snapshot(page);
    const clearTap = await clientPoint(page, AXES[2].grip);
    await page.mouse.click(clearTap.x, clearTap.y);
    assert.deepEqual({ state:(await snapshot(page)).state, history:(await snapshot(page)).history }, { state:clearState.state, history:clearState.history }, 'clear tap changed state');
    await saveEvidenceScreenshot(page, 'pc-1440x1000-clear.png');
    await waitReady(page);
    assert.deepEqual({ state:(await snapshot(page)).state, history:(await snapshot(page)).history, invariant:(await snapshot(page)).invariant }, { state:0, history:1, invariant:'passed' });
    await page.locator('#w7-board-undo').click();
    await page.locator('#w7-board-restart').evaluate(button => button.click());
    assert.equal((await snapshot(page)).phase, 'undoing', 'Restart interrupted Undo');
    await waitReady(page);
    assert.deepEqual({ state:(await snapshot(page)).state, history:(await snapshot(page)).history }, { state:31, history:0 });
    await page.reload();
    await waitReady(page);
    assert.deepEqual({ state:(await snapshot(page)).state, history:(await snapshot(page)).history, invariant:(await snapshot(page)).invariant }, { state:31, history:0, invariant:'passed' }, 'reload did not return to the static P2 problem');
    assert.deepEqual(errors, [], 'PC console errors');
    results.pc = 'passed';
    await pcContext.close();

    const mobileContext = await browser.newContext({ viewport:{ width:360, height:800 }, isMobile:true, hasTouch:true, deviceScaleFactor:1 });
    const mobile = await openPage(mobileContext);
    await waitReady(mobile.page);
    await saveEvidenceScreenshot(mobile.page, 'mobile-360x800-ready.png');
    const cdp = await mobileContext.newCDPSession(mobile.page);
    await touchDrag(mobile.page, cdp, 0, -120);
    await waitReady(mobile.page);
    assert.deepEqual({ state:(await snapshot(mobile.page)).state, history:(await snapshot(mobile.page)).history, invariant:(await snapshot(mobile.page)).invariant }, { state:0, history:1, invariant:'passed' }, 'touch solve failed');
    await mobile.page.locator('#w7-board-undo').click();
    await waitReady(mobile.page);
    assert.deepEqual({ state:(await snapshot(mobile.page)).state, history:(await snapshot(mobile.page)).history }, { state:31, history:0 }, 'touch result Undo failed');
    assert.deepEqual(mobile.errors, [], 'mobile console errors');
    results.mobile = 'passed';
    await mobileContext.close();

    const reducedContext = await browser.newContext({ viewport:{ width:1440, height:1000 }, reducedMotion:'reduce' });
    const reduced = await openPage(reducedContext);
    await waitReady(reduced.page);
    await mouseDrag(reduced.page, 0, -120);
    await waitReady(reduced.page);
    assert.deepEqual({ state:(await snapshot(reduced.page)).state, history:(await snapshot(reduced.page)).history, invariant:(await snapshot(reduced.page)).invariant }, { state:0, history:1, invariant:'passed' }, 'reduced motion did not reach final state');
    assert.deepEqual(reduced.errors, [], 'reduced-motion console errors');
    results.reducedMotion = 'passed';
    await reducedContext.close();
    console.log(JSON.stringify(results));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
