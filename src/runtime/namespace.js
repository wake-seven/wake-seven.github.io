/* 公開APIの境界。既存のグローバル関数は互換のため残し、外部からはこの名前空間を入口にする。 */
(function attachWakeSevenNamespace(global) {
  'use strict';
  // 公開名前空間は単一の初期化入口。重複読込で外部参照を差し替えない。
  if (global.WakeSeven?.state) return;

  const stateApi = Object.freeze({
    get current() { return gameState; },
    get navigation() { return WakeSevenState.navigationView(gameState); },
    get settings() { return gameState.settings; },
    get progress() { return gameState.progress; },
    persist() { return persistActiveSession(); },
    updateNavigation(patch) { return WakeSevenState.updateNavigation(gameState, patch); },
    updateSettings(patch) { return WakeSevenState.updateSettings(gameState, patch); }
  });

  const progressionApi = Object.freeze({
    get definition() { return PROGRESSION; },
    get context() { return getGameContext(); },
    get uiPolicy() { return PROGRESSION.uiPolicy; }
  });

  const messagesApi = Object.freeze({
    openReview(options) { return openMessageReview(options); },
    renderReview() { return renderMessageReview(); },
    get entries() { return messageReviewEntries; }
  });

  const speedApi = Object.freeze({
    pause() { return pauseSpeedRun(); },
    startClock() { return startSpeedClock(); },
    pauseClock() { return pauseSpeedClock(); },
    get definitions() { return SPEED_MODE_DEFINITIONS; }
  });

  global.WakeSeven = Object.freeze({state: stateApi, progression: progressionApi, messages: messagesApi, speed: speedApi});
})(window);
// 公開native moduleの構文境界。
export {};
