// 進行報酬を書き込む操作命令。節目ダイアログの表示処理から状態更新を分離する。
function grantMasterDialogRewardsCommand(kind){
  if(kind==='satori'&&!secondLapActive){unlockSpeedVariant('satori73');renderStageNav();}
  if(kind==='mastery'&&secondLapActive&&!rainbowDarumaGranted){
    rainbowDarumaGranted=setUnlock('rainbowDarumaGranted',true);darumaColor='rainbow';darumaColorChosen=false;
    try{storage.set(STORAGE_KEY_GROUPS.rewards.rainbowDarumaGranted,'1');storage.remove(STORAGE_KEY_GROUPS.settings.darumaColorChosen);}catch(_){ }
    updateMasterTheme();renderStageNav();
  }
  if(kind==='awakening'&&!awakenedGranted){
    awakenedGranted=setUnlock('awakened',true);threeDUnlocked=setUnlock('threeD',true);
    try{storage.set(STORAGE_KEY_GROUPS.rewards.awakenedGranted,'1');storage.set(STORAGE_KEY_GROUPS.rewards.threeDUnlocked,'1');}catch(_){ }
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
// ダイアログ要求の共通入口。呼び出し元はsourceを残せるため、
// クリア・速解き・復元・メニューのどこから開いたかを追跡できる。
function requestProgressionDialog({kind, options={}, source='unknown'}={}){
  const request={...options,source};
  if(kind==='messages')return openMessageReview(request);
  if(kind==='ranks')return openRankDialog(request);
  if(kind==='mastery')return showMasterDialog(request.kind||'');
  return false;
}
const GameDialogs=Object.freeze({
  messages:options=>requestProgressionDialog({kind:'messages',options,source:options?.source||'menu'}),
  ranks:options=>requestProgressionDialog({kind:'ranks',options,source:options?.source||'menu'}),
  mastery:kind=>requestProgressionDialog({kind:'mastery',options:{kind},source:'progression'})
});
const WakeSevenProgressionCommands=Object.freeze({
  startSpeedRun:()=>beginSpeedRun(), advanceSpeedRun:()=>advanceSpeedRun(),
  loadStage:index=>loadStage(index), loadMasteryStage:index=>loadExtraStage(index),
  loadSatoriStage:index=>loadSatoriStage(index), startFree:()=>startFree(),
  advanceAfterClear:()=>advanceAfterClear()
});
export {};
