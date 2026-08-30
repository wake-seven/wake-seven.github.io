import { createBoardDomain } from './domain/board.mjs';
import { createGameStore } from './state/store.mjs';

/** Development ESM entry point. The published build still uses index.html. */
export function createDevelopmentRuntime({ cellCount = 7, triangles = [] } = {}) {
  return Object.freeze({
    board: createBoardDomain({ cellCount, triangles }),
    store: createGameStore({ navigation: { mode: 'stage', lap: 1 } })
  });
}
