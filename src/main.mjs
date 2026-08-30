import { createBoardDomain } from './domain/board.mjs';
import { createProgressionDomain } from './domain/progression.mjs';
import { createGameStore } from './state/store.mjs';
import { createPersistence } from './state/persistence.mjs';
import { createBoardQuizCatalog } from './data/board-quiz.mjs';
import { createMessageCatalog } from './data/messages.mjs';
import { createSatoriCatalog } from './data/satori.mjs';

/** Development ESM entry point. The published build still uses index.html. */
export function createDevelopmentRuntime({ cellCount = 7, triangles = [], data = {} } = {}) {
  const store = createGameStore({ navigation: { mode: 'stage', lap: 1 } });
  const board = createBoardDomain({ cellCount, triangles });
  const progression = createProgressionDomain();
  const persistence = createPersistence({
    storage: globalThis.localStorage,
    create: value => value
  });
  return Object.freeze({ board, progression, store, persistence, data: Object.freeze({
    messages: createMessageCatalog(data.clearContent),
    satori: createSatoriCatalog(data.satoriStages),
    boardQuiz: createBoardQuizCatalog(data.boardQuizCopy)
  }) });
}
