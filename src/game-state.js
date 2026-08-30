/*
 * WAKE SEVEN state foundation.
 *
 * The public build in index.html is intentionally self-contained.  This file
 * is injected as an inline script by scripts/build-index.mjs so it remains
 * available on GitHub Pages without a bundler or extra runtime requests.
 */
(function attachWakeSevenState(global) {
  'use strict';

  const STORAGE_KEY = 'wake7-state-vnext';
  const VERSION = 1;
  const MODES = Object.freeze(['tutorial', 'stage', 'mastery', 'satori', 'speed', 'free', 'custom']);

  const clone = value => JSON.parse(JSON.stringify(value));
  const asArray = value => Array.isArray(value) ? value : [];
  const asIndex = value => Number.isInteger(value) && value >= 0 ? value : 0;
  const asLap = value => value === 2 ? 2 : 1;

  function create(seed = {}) {
    const state = {
      version: VERSION,
      navigation: {
        mode: MODES.includes(seed.navigation?.mode) ? seed.navigation.mode : 'stage',
        lap: asLap(seed.navigation?.lap),
        stageIndex: asIndex(seed.navigation?.stageIndex),
        masteryIndex: asIndex(seed.navigation?.masteryIndex),
        satoriIndex: asIndex(seed.navigation?.satoriIndex),
        tutorialStep: asIndex(seed.navigation?.tutorialStep)
      },
      board: seed.board && typeof seed.board === 'object' ? clone(seed.board) : null,
      progress: {
        lap1: normalizeProgress(seed.progress?.lap1),
        lap2: normalizeProgress(seed.progress?.lap2)
      },
      unlocks: seed.unlocks && typeof seed.unlocks === 'object' ? clone(seed.unlocks) : {},
      settings: seed.settings && typeof seed.settings === 'object' ? clone(seed.settings) : {},
      speed: {
        activeVariant: typeof seed.speed?.activeVariant === 'string' ? seed.speed.activeVariant : 'training9',
        sessions: seed.speed?.sessions && typeof seed.speed.sessions === 'object' ? clone(seed.speed.sessions) : {}
      },
      ui: seed.ui && typeof seed.ui === 'object' ? clone(seed.ui) : {},
      // Keeping the exact legacy payload makes the migration reversible while
      // the rest of the UI is incrementally moved to this canonical shape.
      legacySession: seed.legacySession && typeof seed.legacySession === 'object' ? clone(seed.legacySession) : null
    };
    return state;
  }

  function normalizeProgress(value) {
    return {
      primary: asArray(value?.primary),
      mastery: asArray(value?.mastery),
      satori: asArray(value?.satori)
    };
  }

  function read(storage = global.localStorage) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.version === VERSION ? create(parsed) : null;
    } catch (_) {
      return null;
    }
  }

  function write(state, storage = global.localStorage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(create(state)));
      return true;
    } catch (_) {
      return false;
    }
  }

  function readJson(storage, key) {
    try { return JSON.parse(storage.getItem(key) || '[]'); } catch (_) { return []; }
  }

  function migrateLegacy(storage = global.localStorage) {
    const existing = read(storage);
    if (existing) return existing;
    const session = readJson(storage, 'wake7-active-session');
    const activeLap = Number(storage.getItem('wake7-active-lap')) === 2 ? 2 : 1;
    const mode = typeof session?.mode === 'string' ? session.mode : 'stage';
    const state = create({
      navigation: {
        mode,
        lap: activeLap,
        stageIndex: session?.extra || session?.satori ? 0 : session?.index,
        masteryIndex: session?.extra ? session?.index : 0,
        satoriIndex: session?.satori ? session?.index : 0,
        tutorialStep: session?.step
      },
      board: session?.board || null,
      progress: {
        lap1: {
          primary: readJson(storage, 'wake7-lap1-primary-cleared').length ? readJson(storage, 'wake7-lap1-primary-cleared') : readJson(storage, 'wake7-cleared'),
          mastery: readJson(storage, 'wake7-lap1-extra-cleared').length ? readJson(storage, 'wake7-lap1-extra-cleared') : readJson(storage, 'wake7-extra-cleared'),
          satori: readJson(storage, 'wake7-lap1-satori-cleared').length ? readJson(storage, 'wake7-lap1-satori-cleared') : readJson(storage, 'wake7-satori-cleared')
        },
        lap2: {
          primary: readJson(storage, 'wake7-lap2-primary-cleared'),
          mastery: readJson(storage, 'wake7-lap2-extra-cleared'),
          satori: readJson(storage, 'wake7-lap2-satori-cleared')
        }
      },
      settings: {
        language: storage.getItem('wake7-language') || 'ja',
        sound: storage.getItem('wake7-sound') !== 'off',
        boardTheme: storage.getItem('wake7-board-theme') || 'default',
        boardLayout: storage.getItem('wake7-board-layout') || 'normal',
        darumaColor: storage.getItem('wake7-daruma-color') || 'red'
      },
      unlocks: {
        secondLap: storage.getItem('wake7-second-lap-unlocked') === '1',
        awakened: storage.getItem('wake7-awakened-granted') === '1',
        threeD: storage.getItem('wake7-3d-unlocked') === '1',
        speedTraining: storage.getItem('wake7-speed-training-unlocked') === '1',
        speedIntermediate: storage.getItem('wake7-speed-intermediate-unlocked') === '1',
        speedMastery: storage.getItem('wake7-speed-mastery-unlocked') === '1',
        speedSatori: storage.getItem('wake7-speed-satori-unlocked') === '1'
      },
      speed: { activeVariant: storage.getItem('wake7-speed-active-variant') || 'training9' },
      legacySession: session && typeof session === 'object' ? session : null
    });
    write(state, storage);
    return state;
  }

  global.WakeSevenState = Object.freeze({
    STORAGE_KEY,
    VERSION,
    MODES,
    create,
    read,
    write,
    migrateLegacy
  });
})(window);
