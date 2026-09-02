// ===== アプリケーション共有状態の入口 =====
// 画面やコマンドから runtime.js の変数を直接読み書きする箇所を
// 少しずつ減らすための、小さな共有状態ゲートウェイ。
// ここでは状態の所有権を奪わず、既存ランタイムの値へ安全に委譲する。
const WakeSevenAppContext=Object.freeze({
  // 現在の画面状態を、表示処理が使える読み取り専用スナップショットで返す。
  snapshot(){
    return Object.freeze({
      mode:activeMode,
      clearShown,
      lap:activeLap,
      stageIndex,
      masteryIndex:extraIndex,
      satoriIndex,
      tutorialStep
    });
  },
  isClearShown(){return clearShown===true;},
  // clearShown の変更はここを通す。保存は既存の syncGameState の責務とする。
  setClearShown(value){clearShown=value===true;return clearShown;},
  setMode(mode){setActiveMode(mode);return activeMode;}
});
