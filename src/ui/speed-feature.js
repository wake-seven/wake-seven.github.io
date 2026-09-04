// ===== 速解きセッションの入口 =====
// 開始・一時停止・再開・復元の呼び出しを一つの機能入口から追跡する。
// タイマー計算、問題データ、保存の実装は既存の所有モジュールへ委譲する。
function readSpeedFeatureContext(){const navigation=readNavigationContext();return Object.freeze({
  variant:speedVariant,
  mode:navigation.mode,
  session:typeof readActiveSpeedSession==='function'?readActiveSpeedSession():null,
  running:typeof isMode==='function'&&isMode('speed')
});}
const WakeSevenSpeedFeature=Object.freeze({
  context:readSpeedFeatureContext,
  openPicker(){return openSpeedPicker();},
  start(forceNew=false){return enterSpeedMode(forceNew);},
  pause(){return pauseSpeedRun();},
  resume(){return resumeSpeedRun();},
  restore(){return enterSpeedMode(false);}
});
export {};
