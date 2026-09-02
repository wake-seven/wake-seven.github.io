// 進行報酬を書き込む操作命令。節目ダイアログの表示処理から状態更新を分離する。
function grantMasterDialogRewardsCommand(kind){
  if(kind==='satori'&&!secondLapActive){unlockSpeedVariant('satori73');renderStageNav();}
  if(kind==='mastery'&&secondLapActive&&!rainbowDarumaGranted){
    rainbowDarumaGranted=setUnlock('rainbowDarumaGranted',true);darumaColor='rainbow';darumaColorChosen=false;
    try{commandStorageSet(STORAGE_KEY_GROUPS.rewards.rainbowDarumaGranted,'1');commandStorageRemove(STORAGE_KEY_GROUPS.settings.darumaColorChosen);}catch(_){ }
    updateMasterTheme();renderStageNav();
  }
  if(kind==='awakening'&&!awakenedGranted){
    awakenedGranted=setUnlock('awakened',true);threeDUnlocked=setUnlock('threeD',true);
    try{commandStorageSet(STORAGE_KEY_GROUPS.rewards.awakenedGranted,'1');commandStorageSet(STORAGE_KEY_GROUPS.rewards.threeDUnlocked,'1');}catch(_){ }
    persistLapProgress();updateMasterTheme();renderStageNav();rememberSpecialMessage('awakening');
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
// 進行画面・速解きから呼ぶ状態変更の入口。UIはこのAPIだけを参照する。
const GameNavigation=Object.freeze({
  tutorial:()=>startTutorial(), stage:index=>loadStage(index), mastery:index=>loadExtraStage(index),
  satori:index=>loadSatoriStage(index), free:()=>startFree(), maker:()=>enterBoardMaker(),
  stageMenu:()=>returnToStageMode(), speedPicker:()=>openSpeedPicker()
});
// ダイアログ要求の実装はui/progression-dialogs.jsの単一入口へ集約する。
const GameDialogs=Object.freeze({
  messages:options=>requestProgressionDialog('messages',options,options?.source||'menu'),
  ranks:options=>requestProgressionDialog('ranks',options,options?.source||'menu'),
  mastery:kind=>requestProgressionDialog('mastery',{kind},'progression')
});
const WakeSevenProgressionCommands=Object.freeze({
  startSpeedRun:()=>beginSpeedRun(), advanceSpeedRun:()=>advanceSpeedRun(),
  loadStage:index=>loadStage(index), loadMasteryStage:index=>loadExtraStage(index),
  loadSatoriStage:index=>loadSatoriStage(index), startFree:()=>startFree(),
  advanceAfterClear:()=>advanceAfterClear()
});
export {};
