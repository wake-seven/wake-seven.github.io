// 進行報酬を書き込む操作命令。節目ダイアログの表示処理から状態更新を分離する。
function grantMasterDialogRewardsCommand(kind){
  if(kind==='satori'&&!secondLapActive){unlockSpeedVariant('satori73');renderStageNav();}
  if(kind==='mastery'&&secondLapActive&&!rainbowDarumaGranted){
    rainbowDarumaGranted=setUnlock('rainbowDarumaGranted',true);darumaColor='rainbow';darumaColorChosen=false;
    try{commandStorageSet(STORAGE_KEY_GROUPS.rewards.rainbowDarumaGranted,'1');commandStorageRemove(STORAGE_KEY_GROUPS.settings.darumaColorChosen);}catch(_){ }
    updateMasterTheme();renderStageNav();syncGameState();
  }
  if(kind==='awakening'&&!awakenedGranted){
    awakenedGranted=setUnlock('awakened',true);threeDUnlocked=setUnlock('threeD',true);
    try{commandStorageSet(STORAGE_KEY_GROUPS.rewards.awakenedGranted,'1');commandStorageSet(STORAGE_KEY_GROUPS.rewards.threeDUnlocked,'1');}catch(_){ }
    persistLapProgress();updateMasterTheme();renderStageNav();rememberSpecialMessage('awakening');syncGameState();
  }
}
// クリア済み集合への反映と保存を一つの境界にまとめる。
function recordProgressClearCommand(kind,index){
  if(!Number.isInteger(index)||index<0)return false;
  if(kind==='satori')clearedSatoriStages.add(index);
  else if(kind==='mastery')clearedExtraStages.add(index);
  else if(kind==='primary')clearedStages.add(index);
  else return false;
  persistLapProgress();
  return true;
}
// 進行処理の公開入口。UIやイベントは実装関数を直接呼ばず、ここを経由する。
// 入口名と実装名の対応は scripts/progression-entry-points.mjs の追跡レポートにも出力する。
const ProgressionEntryPoints=Object.freeze({
  showProgressionDialog:(kind,context={},source='unknown')=>requestProgressionDialog(kind,context,source),
  advanceAfterClear:()=>advanceAfterClear(),
  startStage:index=>loadStage(index),
  finishStage:options=>completeBoard(options),
  returnToMenu:()=>returnToStageMode()
});
const GameNavigation=Object.freeze({
  tutorial:()=>startTutorial(), stage:index=>ProgressionEntryPoints.startStage(index), mastery:index=>loadExtraStage(index),
  satori:index=>loadSatoriStage(index), free:()=>startFree(), maker:()=>enterBoardMaker(),
  stageMenu:()=>ProgressionEntryPoints.returnToMenu(), speedPicker:()=>WakeSevenSpeedFeature.openPicker()
});
// ダイアログ要求の実装はui/progression-dialogs.jsの単一入口へ集約する。
const GameDialogs=Object.freeze({
  messages:options=>ProgressionEntryPoints.showProgressionDialog('messages',options,options?.source||'menu'),
  ranks:options=>ProgressionEntryPoints.showProgressionDialog('ranks',options,options?.source||'menu'),
  mastery:kind=>ProgressionEntryPoints.showProgressionDialog('mastery',{kind},'progression')
});
const WakeSevenProgressionCommands=Object.freeze({
  startSpeedRun:()=>beginSpeedRun(), advanceSpeedRun:()=>advanceSpeedRun(),
  loadStage:index=>ProgressionEntryPoints.startStage(index), loadMasteryStage:index=>loadExtraStage(index),
  loadSatoriStage:index=>loadSatoriStage(index), startFree:()=>startFree(),
  advanceAfterClear:()=>ProgressionEntryPoints.advanceAfterClear()
});
export {};
