import assert from 'node:assert/strict';
import { createDevelopmentRuntime } from '../src/main.mjs';

const runtime = createDevelopmentRuntime({ triangles: [{ cells: [0, 1, 2] }] });
assert.equal(runtime.board.stateCount, 2187);
const board = Uint8Array.from([0, 1, 2, 0, 1, 2, 1]);
assert.deepEqual(Array.from(runtime.board.decode(runtime.board.encode(board))), Array.from(board));
assert.deepEqual(Array.from(runtime.board.roll(runtime.board.roll(board, 0, 1), 0, -1)), Array.from(board));
let notified = false;
const unsubscribe = runtime.store.subscribe(() => { notified = true; });
runtime.store.update({ navigation: { mode: 'tutorial', lap: 1 } });
unsubscribe();
assert.equal(notified, true);
console.log('Validated development ES module entry point.');
